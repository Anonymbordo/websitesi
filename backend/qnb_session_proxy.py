from __future__ import annotations

import base64
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from decouple import config


SESSION_TTL_SECONDS = int(config("QNB_PROXY_SESSION_TTL_SECONDS", default="1800"))
_SESSION_LOCK = threading.Lock()


@dataclass
class QnbProxySession:
    session_id: str
    cookies: httpx.Cookies = field(default_factory=httpx.Cookies)
    allowed_hosts: set[str] = field(default_factory=set)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    last_url: str = ""


_SESSIONS: dict[str, QnbProxySession] = {}


def _cleanup_stale_sessions() -> None:
    if SESSION_TTL_SECONDS <= 0:
        return

    threshold = time.time() - SESSION_TTL_SECONDS
    stale_ids = [
        session_id
        for session_id, session in _SESSIONS.items()
        if session.updated_at < threshold
    ]
    for session_id in stale_ids:
        _SESSIONS.pop(session_id, None)


def _encode_target_url(url: str) -> str:
    raw = url.encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def decode_target_url(token: str) -> str:
    if not token:
        return ""

    padded = token + "=" * (-len(token) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")


def _is_proxyable_qnb_url(url: str, allowed_hosts: set[str]) -> bool:
    cleaned = (url or "").strip()
    if not cleaned or cleaned.startswith("#"):
        return False
    if cleaned.lower().startswith(("javascript:", "mailto:", "tel:", "data:")):
        return False

    parsed = urlparse(cleaned)
    if parsed.scheme and parsed.scheme not in {"http", "https"}:
        return False

    hostname = (parsed.hostname or "").lower()
    return bool(hostname and hostname in {host.lower() for host in allowed_hosts})


def _make_proxy_url(proxy_base_url: str, session_id: str, target_url: str) -> str:
    token = _encode_target_url(target_url)
    return f"{proxy_base_url.rstrip('/')}/api/payments/qnb/proxy/{session_id}?target={token}"


def _resolve_url(current_url: str, candidate: str) -> str:
    return urljoin(current_url, (candidate or "").strip())


def _normalize_proxy_base_url(proxy_base_url: str) -> str:
    cleaned = (proxy_base_url or "").strip().rstrip("/")
    if cleaned.startswith(("http://", "https://")):
        return cleaned
    return ""


def create_qnb_proxy_session(
    *,
    gateway_url: str,
    form_fields: dict[str, str],
    proxy_base_url: str,
    timeout_seconds: float = 30.0,
) -> dict[str, Any]:
    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        response = client.post(
            gateway_url,
            data=form_fields,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "User-Agent": "Mikrokurs-Payment-Service/1.0",
            },
        )

        session = QnbProxySession(
            session_id=secrets.token_urlsafe(24),
            cookies=httpx.Cookies(client.cookies),
            allowed_hosts={
                host.lower()
                for host in [
                    urlparse(gateway_url).hostname or "",
                    urlparse(str(response.url)).hostname or "",
                ]
                if host
            },
            last_url=str(response.url),
        )

    with _SESSION_LOCK:
        _cleanup_stale_sessions()
        _SESSIONS[session.session_id] = session

    content_type = response.headers.get("content-type", "")
    body = response.text or ""
    is_html = "html" in content_type.lower() or "<html" in body.lower()

    if is_html:
        body = rewrite_qnb_html_for_proxy(
            html=body,
            current_url=str(response.url),
            session_id=session.session_id,
            proxy_base_url=proxy_base_url,
            allowed_hosts=session.allowed_hosts,
        )

    return {
        "session_id": session.session_id,
        "status_code": response.status_code,
        "content_type": content_type,
        "body": body,
        "content": response.content,
        "final_url": str(response.url),
        "is_html": is_html,
    }


def perform_qnb_proxy_request(
    *,
    session_id: str,
    target_url: str,
    method: str = "GET",
    form_data: dict[str, str] | None = None,
    proxy_base_url: str,
    timeout_seconds: float = 45.0,
) -> dict[str, Any]:
    with _SESSION_LOCK:
        _cleanup_stale_sessions()
        session = _SESSIONS.get(session_id)
        if not session:
            raise ValueError("QNB proxy session not found or expired.")

        allowed_hosts = set(session.allowed_hosts)
        session_cookies = httpx.Cookies(session.cookies)

    normalized_target_url = _resolve_url(session.last_url or target_url, target_url)
    if not _is_proxyable_qnb_url(normalized_target_url, allowed_hosts):
        raise ValueError("Target URL is not allowed for this QNB proxy session.")

    with httpx.Client(timeout=timeout_seconds, follow_redirects=True, cookies=session_cookies) as client:
        response = client.request(
            method.upper(),
            normalized_target_url,
            data=form_data or None,
            headers={
                "Accept": "*/*",
                "User-Agent": "Mikrokurs-Payment-Service/1.0",
            },
        )
        updated_cookies = httpx.Cookies(client.cookies)

    with _SESSION_LOCK:
        live_session = _SESSIONS.get(session_id)
        if live_session:
            live_session.cookies = updated_cookies
            live_session.last_url = str(response.url)
            hostname = (urlparse(str(response.url)).hostname or "").lower()
            if hostname:
                live_session.allowed_hosts.add(hostname)
            live_session.updated_at = time.time()
            allowed_hosts = set(live_session.allowed_hosts)

    content_type = response.headers.get("content-type", "")
    body = response.text or ""
    is_html = "html" in content_type.lower() or "<html" in body.lower()

    if is_html:
        body = rewrite_qnb_html_for_proxy(
            html=body,
            current_url=str(response.url),
            session_id=session_id,
            proxy_base_url=proxy_base_url,
            allowed_hosts=allowed_hosts,
        )

    return {
        "status_code": response.status_code,
        "content_type": content_type,
        "body": body,
        "content": response.content,
        "final_url": str(response.url),
        "is_html": is_html,
    }


_ATTR_RE = re.compile(
    r"""(?P<name>[^\s=/>]+)(?:\s*=\s*(?P<quote>["']?)(?P<value>.*?)(?P=quote))?""",
    re.DOTALL,
)
_TAG_RE = re.compile(r"<(?P<tag>[a-zA-Z0-9:_-]+)\b(?P<attrs>[^<>]*?)(?P<closing>/?)>", re.DOTALL)


def _parse_attrs(raw_attrs: str) -> list[tuple[str, str | None, str]]:
    parsed: list[tuple[str, str | None, str]] = []
    for match in _ATTR_RE.finditer(raw_attrs or ""):
        name = match.group("name")
        if not name:
            continue
        value = match.group("value")
        quote = match.group("quote") or '"'
        parsed.append((name, value, quote))
    return parsed


def _rebuild_tag(tag: str, attrs: list[tuple[str, str | None, str]], closing: str) -> str:
    rendered_attrs: list[str] = []
    for name, value, quote in attrs:
        if value is None:
            rendered_attrs.append(name)
        else:
            rendered_attrs.append(f'{name}={quote}{value}{quote}')
    joined = (" " + " ".join(rendered_attrs)) if rendered_attrs else ""
    suffix = "/" if closing else ""
    return f"<{tag}{joined}{suffix}>"


def rewrite_qnb_html_for_proxy(
    *,
    html: str,
    current_url: str,
    session_id: str,
    proxy_base_url: str,
    allowed_hosts: set[str],
) -> str:
    proxy_base = _normalize_proxy_base_url(proxy_base_url)
    if not html or not proxy_base:
        return html or ""

    lower_allowed_hosts = {host.lower() for host in allowed_hosts if host}
    callback_input_names = {"termurl", "termurl3d", "returnurl", "redirecturl"}
    proxy_navigation_tags = {
        ("form", "action"),
        ("a", "href"),
        ("iframe", "src"),
    }
    absolute_asset_tags = {
        ("img", "src"),
        ("script", "src"),
        ("link", "href"),
        ("source", "src"),
    }

    def _replace_tag(match: re.Match[str]) -> str:
        tag = match.group("tag")
        attrs_raw = match.group("attrs") or ""
        closing = match.group("closing") or ""
        tag_lower = tag.lower()

        if tag_lower == "base":
            return ""

        attrs = _parse_attrs(attrs_raw)
        if not attrs:
            return match.group(0)

        attr_map = {name.lower(): index for index, (name, _, _) in enumerate(attrs)}

        for attr_name in ("action", "href", "src"):
            key = (tag_lower, attr_name)
            if key not in proxy_navigation_tags and key not in absolute_asset_tags:
                continue
            index = attr_map.get(attr_name)
            if index is None:
                continue
            original_name, original_value, quote = attrs[index]
            if not original_value:
                if key == ("form", "action"):
                    original_value = current_url
                else:
                    continue
            resolved_url = _resolve_url(current_url, original_value)
            if not _is_proxyable_qnb_url(resolved_url, lower_allowed_hosts):
                continue
            if key in proxy_navigation_tags:
                attrs[index] = (original_name, _make_proxy_url(proxy_base, session_id, resolved_url), quote)
            else:
                attrs[index] = (original_name, resolved_url, quote)

        if tag_lower == "input":
            name_index = attr_map.get("name")
            value_index = attr_map.get("value")
            if name_index is not None and value_index is not None:
                input_name = (attrs[name_index][1] or "").strip().lower()
                original_name, original_value, quote = attrs[value_index]
                if input_name in callback_input_names and original_value:
                    resolved_url = _resolve_url(current_url, original_value)
                    if _is_proxyable_qnb_url(resolved_url, lower_allowed_hosts):
                        attrs[value_index] = (
                            original_name,
                            _make_proxy_url(proxy_base, session_id, resolved_url),
                            quote,
                        )

        return _rebuild_tag(tag, attrs, closing)

    return _TAG_RE.sub(_replace_tag, html)

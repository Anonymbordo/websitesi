import boto3
from botocore.exceptions import NoCredentialsError
import os
from datetime import datetime, timedelta
from urllib.parse import unquote, urlparse

from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

# Strip whitespace and newlines from environment variables
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "").strip() or None
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip() or None
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1").strip()
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "").strip() or None
MEDIA_TOKEN_SECRET = (os.getenv("MEDIA_TOKEN_SECRET") or os.getenv("SECRET_KEY") or "your-secret-key-here").strip()
MEDIA_TOKEN_ALGORITHM = "HS256"
MEDIA_STREAM_PATH_PREFIX = "/api/media/stream"

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )


def get_s3_object_name_from_url(file_url: str | None) -> str | None:
    if not file_url:
        return None

    normalized_url = file_url.strip()
    if not normalized_url:
        return None

    parsed = urlparse(normalized_url)
    if not parsed.netloc:
        return None

    object_path = unquote(parsed.path.lstrip("/"))
    if not object_path:
        return None

    bucket_hosts = {
        f"{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com",
        f"{AWS_BUCKET_NAME}.s3.amazonaws.com",
    }
    if parsed.netloc in bucket_hosts:
        return object_path

    if parsed.netloc in {f"s3.{AWS_REGION}.amazonaws.com", "s3.amazonaws.com"}:
        path_parts = object_path.split("/", 1)
        if len(path_parts) == 2 and path_parts[0] == AWS_BUCKET_NAME:
            return path_parts[1]

    return None


def create_media_stream_token(object_name: str, expires_in: int = 1800) -> str:
    expire = datetime.utcnow() + timedelta(seconds=expires_in)
    payload = {
        "scope": "media:stream",
        "key": object_name,
        "exp": expire,
    }
    return jwt.encode(payload, MEDIA_TOKEN_SECRET, algorithm=MEDIA_TOKEN_ALGORITHM)


def decode_media_stream_token(token: str) -> str:
    try:
        payload = jwt.decode(token, MEDIA_TOKEN_SECRET, algorithms=[MEDIA_TOKEN_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired media token") from exc

    if payload.get("scope") != "media:stream":
        raise ValueError("Invalid media token scope")

    object_name = payload.get("key")
    if not object_name:
        raise ValueError("Media token is missing object key")

    return object_name


def build_secure_media_stream_path(file_url: str | None, expires_in: int = 1800) -> str | None:
    object_name = get_s3_object_name_from_url(file_url)
    if not object_name:
        return file_url

    token = create_media_stream_token(object_name, expires_in=expires_in)
    return f"{MEDIA_STREAM_PATH_PREFIX}/{token}"

def upload_file_to_s3(file_obj, object_name, content_type=None):
    """Upload a file to an S3 bucket"""
    # Check credentials
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_BUCKET_NAME:
        print("Error: AWS credentials or bucket name are missing in environment variables!")
        return None

    s3_client = get_s3_client()
    try:
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)

        # Note: We removed ACL='public-read' because modern S3 buckets often enforce 
        # "Bucket owner enforced" setting which disables ACLs. 
        # We rely on Bucket Policy for public access.
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
            
        print(f"Uploading to S3: Bucket={AWS_BUCKET_NAME}, Key={object_name}")
        
        s3_client.upload_fileobj(
            file_obj,
            AWS_BUCKET_NAME,
            object_name,
            ExtraArgs=extra_args
        )
        
        # Generate the URL
        url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{object_name}"
        print(f"Upload successful. URL: {url}")
        return url
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return None


def get_public_s3_url(object_name: str) -> str:
    """Return public URL for an object key."""
    if not AWS_BUCKET_NAME:
        print("❌ ERROR: AWS_BUCKET_NAME is not set!")
        raise ValueError("AWS_BUCKET_NAME environment variable is required")
    if not AWS_REGION:
        print("❌ ERROR: AWS_REGION is not set!")
        raise ValueError("AWS_REGION environment variable is required")
    return f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{object_name}"


def generate_presigned_put_url(object_name: str, content_type: str | None = None, expires_in: int = 3600):
    """Generate a presigned PUT url so clients can upload directly to S3."""
    # Detailed credential check
    missing = []
    if not AWS_ACCESS_KEY_ID:
        missing.append("AWS_ACCESS_KEY_ID")
    if not AWS_SECRET_ACCESS_KEY:
        missing.append("AWS_SECRET_ACCESS_KEY")
    if not AWS_BUCKET_NAME:
        missing.append("AWS_BUCKET_NAME")
    
    if missing:
        error_msg = f"❌ ERROR: Missing AWS credentials: {', '.join(missing)}"
        print(error_msg)
        raise ValueError(error_msg)

    s3_client = get_s3_client()
    try:
        params = {"Bucket": AWS_BUCKET_NAME, "Key": object_name}
        if content_type:
            params["ContentType"] = content_type

        print(f"✅ Generating presigned URL for: {object_name}")
        url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_in,
        )
        print(f"✅ Successfully generated presigned URL")
        return url
    except Exception as e:
        print(f"❌ Error generating presigned URL: {str(e)}")
        print(f"   Bucket: {AWS_BUCKET_NAME}, Object: {object_name}")
        raise

def delete_file_from_s3(file_url):
    """Delete a file from an S3 bucket"""
    s3_client = get_s3_client()
    try:
        # Extract object name from URL
        # URL format: https://BUCKET.s3.REGION.amazonaws.com/OBJECT_NAME
        if f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/" in file_url:
            object_name = file_url.replace(f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/", "")
            s3_client.delete_object(Bucket=AWS_BUCKET_NAME, Key=object_name)
            return True
        return False
    except Exception as e:
        print(f"Error deleting from S3: {e}")
        return False

"""Payment-service regression tests; bank calls and database are isolated."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from payment_service.main import app
from auth import get_current_user
from database import Base, get_db
from models import SchoolCourse, SchoolCoursePurchase, User
from payment_security import _RATE_LIMIT_BUCKETS
from scripts.check_payment_routes import REQUIRED_ROUTES


class SchoolPaymentRoutesTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.user = User(email="test@example.com", phone="05000000000", password_hash="unused", full_name="Test", role="instructor")
        self.course = SchoolCourse(level="ortaokul", grade=7, subject="turkce", title="7. Sınıf Paketi", price=899, is_active=True)
        self.db.add_all([self.user, self.course])
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app, base_url="http://localhost")
        _RATE_LIMIT_BUCKETS.clear()

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def test_service_exposes_all_checkout_and_callback_routes(self):
        paths = self.client.get("/openapi.json").json()["paths"]
        for path, methods in REQUIRED_ROUTES.items():
            self.assertTrue(methods.issubset(paths.get(path, {})), path)

    @patch("school_payments.get_qnb_config", return_value={"missing_fields": []})
    def test_instructor_can_start_school_purchase_without_unlocking_content(self, _config):
        response = self.client.post("/api/payments/school-courses/create-payment", json={"course_id": self.course.id})
        self.assertEqual(response.status_code, 200, response.text)
        purchase = self.db.get(SchoolCoursePurchase, response.json()["payment_id"])
        self.assertEqual(purchase.amount_paid, 899)
        self.assertEqual(purchase.payment_status, "pending")
        checkout = urlsplit(response.json()["checkout_url"])
        self.assertIn("/school-courses/qnb/start/", checkout.path)
        with patch("school_payments.build_qnb_gateway_payload", return_value={
            "ready": True, "gateway_url": "https://bank.invalid", "form_fields": {},
        }), patch("school_payments.create_qnb_proxy_session", return_value={
            "status_code": 200, "body": "<html>Bank checkout</html>", "is_html": True,
        }):
            start = self.client.get(f"{checkout.path}?{checkout.query}")
        self.assertEqual(start.status_code, 200, start.text)
        self.assertIn("Bank checkout", start.text)
        self.assertEqual(purchase.payment_status, "pending")

    def test_unknown_course_is_a_domain_404(self):
        response = self.client.post("/api/payments/school-courses/create-payment", json={"course_id": 99999})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Okul dersi bulunamadı.")

    @patch("school_payments.get_qnb_config", return_value={"missing_fields": []})
    def test_checkout_rejects_invalid_token(self, _config):
        created = self.client.post("/api/payments/school-courses/create-payment", json={"course_id": self.course.id}).json()
        response = self.client.get(f"/api/payments/school-courses/qnb/start/{created['payment_id']}?checkout_token=invalid")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.db.get(SchoolCoursePurchase, created["payment_id"]).payment_status, "pending")


if __name__ == "__main__":
    unittest.main()

import base64
import hashlib
import os
import unittest
from unittest.mock import patch

from payment_gateway_qnb import audit_qnb_request_hash, build_qnb_gateway_payload


class QnbGatewayPayloadTests(unittest.TestCase):
    def test_legacy_env_map_still_posts_mrc_order_id_and_hashes_exact_fields(self):
        env = {
            "QNB_MBR_ID": "5",
            "QNB_MERCHANT_ID": "merchant",
            "QNB_USER_CODE": "api-user",
            "QNB_USER_PASSWORD": "api-password",
            "QNB_MERCHANT_PASS": "merchant-pass",
            "QNB_FIELD_MAP_JSON": '{"order_id":"OrderId","hash":"Hash"}',
            "QNB_HASH_TEMPLATE": "{mbr_id}{mrc_order_id}{amount}{ok_url}{fail_url}{txn_type}{installment_count}{rnd}{merchant_pass}",
        }

        with patch.dict(os.environ, env, clear=False):
            result = build_qnb_gateway_payload(
                base_url="https://pay.mikrokurs.com",
                payment_id=37,
                order_id="QNB-37-408EE0CF29",
                amount=1,
                slug="ucgenlere-giris-dersi",
                course_title="Uclere giris",
                full_name="Test Ogrenci",
                email="ogrenci@example.com",
                phone="05330000000",
                callback_params={"cb_token": "cb1.ASCII-token"},
            )

        fields = result["form_fields"]
        self.assertEqual(fields["OrderId"], "QNB-37-408EE0CF29")
        self.assertEqual(fields["MrcOrderId"], "QNB-37-408EE0CF29")
        self.assertNotIn("slug=", fields["OkUrl"])
        self.assertNotIn("slug=", fields["FailUrl"])

        hash_source = "".join(
            [
                fields["MbrId"],
                fields["MrcOrderId"],
                fields["PurchAmount"],
                fields["OkUrl"],
                fields["FailUrl"],
                fields["TxnType"],
                fields["InstallmentCount"],
                fields["Rnd"],
                "merchant-pass",
            ]
        )
        expected_hash = base64.b64encode(hashlib.sha1(hash_source.encode("ascii")).digest()).decode("ascii")
        self.assertEqual(fields["Hash"], expected_hash)

        with patch.dict(os.environ, env, clear=False):
            audit = audit_qnb_request_hash(fields, "https://pay.mikrokurs.com")
        self.assertTrue(audit["echoed_hash_matches_local"])
        self.assertEqual(audit["echoed_amount"], "1.00")


if __name__ == "__main__":
    unittest.main()

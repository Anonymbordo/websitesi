import os
import json
import firebase_admin
from firebase_admin import credentials, storage

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if firebase_admin._apps:
            return True

        # Try to get credentials from environment variable
        service_account = os.getenv("FIREBASE_SERVICE_ACCOUNT")
        # Or from file
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
        
        cred = None
        if service_account:
            try:
                print(f"DEBUG: Found FIREBASE_SERVICE_ACCOUNT env var (len: {len(service_account)})")
                cred_dict = json.loads(service_account)
                # Mask private key for logs
                if 'private_key' in cred_dict:
                    print("DEBUG: private_key found in JSON")
                else:
                    print("DEBUG: private_key NOT found in JSON")
                    
                cred = credentials.Certificate(cred_dict)
            except json.JSONDecodeError as je:
                print(f"❌ FIREBASE_SERVICE_ACCOUNT environment variable is not valid JSON: {je}")
            except Exception as e:
                print(f"❌ Error creating credentials from JSON: {e}")
        elif os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        
        if cred:
            # Get bucket name from env or use default based on project ID
            # Note: You might need to change the default bucket name
            bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "cengizbey-aa7f3.appspot.com")
            
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
            print(f"✅ Firebase Admin SDK initialized with bucket: {bucket_name}")
            return True
        else:
            print("⚠️ Firebase credentials not found. Please set FIREBASE_SERVICE_ACCOUNT env var or provide firebase-service-account.json")
            return False
            
    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        return False

def upload_file_to_firebase(file_obj, destination_blob_name, content_type):
    """
    Uploads a file to Firebase Storage.
    
    Args:
        file_obj: File-like object (bytes)
        destination_blob_name: Path in the bucket (e.g., uploads/images/file.jpg)
        content_type: MIME type of the file
        
    Returns:
        Public URL of the uploaded file
    """
    if not firebase_admin._apps:
        if not init_firebase():
            raise Exception("Firebase not initialized")

    try:
        bucket = storage.bucket()
        blob = bucket.blob(destination_blob_name)
        
        blob.upload_from_file(file_obj, content_type=content_type)
        blob.make_public()
        
        return blob.public_url
    except Exception as e:
        print(f"❌ Firebase upload error: {e}")
        raise e

def delete_file_from_firebase(file_url):
    """
    Deletes a file from Firebase Storage.
    """
    if not firebase_admin._apps:
        if not init_firebase():
            raise Exception("Firebase not initialized")

    try:
        # Extract blob name from URL
        # URL format: https://storage.googleapis.com/bucket-name/blob-name
        # or https://firebasestorage.googleapis.com/v0/b/bucket-name/o/blob-name...
        
        bucket = storage.bucket()
        
        # Simple heuristic: if it contains the bucket name, try to parse
        # This is a bit tricky without a robust parser, but let's try to handle common cases
        # For now, we assume the input might be the blob name or full URL
        
        blob_name = file_url
        if "googleapis.com" in file_url:
            # Try to extract path after bucket name
            # This is simplified and might need adjustment based on exact URL format
            parts = file_url.split(bucket.name + "/")
            if len(parts) > 1:
                blob_name = parts[1]
        
        blob = bucket.blob(blob_name)
        blob.delete()
        return True
    except Exception as e:
        print(f"❌ Firebase delete error: {e}")
        return False

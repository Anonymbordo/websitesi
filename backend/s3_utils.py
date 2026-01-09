import boto3
from botocore.exceptions import NoCredentialsError
import os
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "eu-central-1")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

def get_s3_client():
    return boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )

def upload_file_to_s3(file_obj, object_name, content_type=None):
    """Upload a file to an S3 bucket"""
    # Check credentials
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_BUCKET_NAME:
        print("Error: AWS credentials or bucket name are missing in environment variables!")
        return None


def get_public_s3_url(object_name: str) -> str:
    """Return public URL for an object key."""
    return f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{object_name}"


def generate_presigned_put_url(object_name: str, content_type: str | None = None, expires_in: int = 3600):
    """Generate a presigned PUT url so clients can upload directly to S3."""
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_BUCKET_NAME:
        print("Error: AWS credentials or bucket name are missing in environment variables!")
        return None

    s3_client = get_s3_client()
    try:
        params = {"Bucket": AWS_BUCKET_NAME, "Key": object_name}
        if content_type:
            params["ContentType"] = content_type

        return s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_in,
        )
    except Exception as e:
        print(f"Error generating presigned URL: {e}")
        return None

    s3_client = get_s3_client()
    try:
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

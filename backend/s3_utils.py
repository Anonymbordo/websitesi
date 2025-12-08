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
    s3_client = get_s3_client()
    try:
        extra_args = {'ACL': 'public-read'}
        if content_type:
            extra_args['ContentType'] = content_type
            
        s3_client.upload_fileobj(
            file_obj,
            AWS_BUCKET_NAME,
            object_name,
            ExtraArgs=extra_args
        )
        
        # Generate the URL
        url = f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{object_name}"
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

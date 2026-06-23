from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import os, pickle

def get_token(token_name):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    oauth_key_path = os.path.join(script_dir, "..", "z_key", "client_secret.json")
    token_path = os.path.join(script_dir, "..", "z_key", f"{token_name}.pkl")
    SCOPES = ['https://www.googleapis.com/auth/admob.readonly']

    creds = None
    if os.path.exists(token_path):
        with open(token_path, 'rb') as f:
            creds = pickle.load(f)

    # Nếu chưa có hoặc refresh token bị lỗi, yêu cầu xác thực lại
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print("Refresh thất bại, cần xác thực lại:", e)
                creds = None
        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(
                oauth_key_path, SCOPES
            )
            creds = flow.run_local_server(port=0, access_type='offline', prompt='consent')
            with open(token_path, 'wb') as f:
                pickle.dump(creds, f)

    return creds.token

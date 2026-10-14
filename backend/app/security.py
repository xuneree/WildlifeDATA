import hashlib
import hmac
import os
import secrets

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


def hash_password(password: str) -> str:
    if len(password) < 12:
        raise ValueError("密码至少 12 个字符")
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return f"scrypt${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    _, salt, expected = stored.split("$")
    actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return hmac.compare_digest(actual, expected)


def signer():
    secret = os.environ["AUTH_SECRET"]
    if len(secret) < 32:
        raise RuntimeError("AUTH_SECRET must contain at least 32 characters")
    return URLSafeTimedSerializer(secret, salt="wildlife-login-v1")


def issue_token(user_id: str):
    return signer().dumps(user_id)


def read_token(token: str):
    try:
        return signer().loads(token, max_age=8 * 3600)
    except (BadSignature, SignatureExpired):
        return None

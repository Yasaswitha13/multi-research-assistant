import os
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException

_jwks_client = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = os.environ["SUPABASE_URL"].rstrip("/") + "/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(url)
    return _jwks_client


def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        try:
            payload = jwt.decode(
                token,
                os.environ["SUPABASE_JWT_SECRET"],
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing sub claim")
    return user_id

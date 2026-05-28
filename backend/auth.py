from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from db import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    token = credentials.credentials
    try:
        response = get_db().auth.get_user(token)
        return response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

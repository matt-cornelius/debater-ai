from fastapi import APIRouter, Depends
from auth import get_current_user
from db import get_db

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/search")
async def search_users(q: str, user_id: str = Depends(get_current_user)):
    result = (
        get_db()
        .table("profiles")
        .select("id, email")
        .ilike("email", f"%{q}%")
        .neq("id", user_id)
        .limit(10)
        .execute()
    )
    return result.data

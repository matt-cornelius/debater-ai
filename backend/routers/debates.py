from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from db import get_db
from services.rag import generate_argument, run_debate

router = APIRouter(prefix="/api/debates", tags=["debates"])


# ── Single-user argument generation (corpus tester) ──────────────────────────

class ArgumentRequest(BaseModel):
    topic: str
    round: Literal["opening", "rebuttal", "closing"]
    opponent_argument: str | None = None


@router.post("/generate-argument")
async def generate_debate_argument(
    req: ArgumentRequest,
    user_id: str = Depends(get_current_user),
):
    return generate_argument(user_id, req.topic, req.round, req.opponent_argument)


# ── Debate sessions ───────────────────────────────────────────────────────────

class DebateCreate(BaseModel):
    topic: str
    opponent_id: str


@router.post("")
async def create_debate(
    req: DebateCreate,
    user_id: str = Depends(get_current_user),
):
    if req.opponent_id == user_id:
        raise HTTPException(400, "You cannot debate yourself.")

    db = get_db()

    debate = (
        db.table("debates")
        .insert({"topic": req.topic, "challenger_id": user_id, "opponent_id": req.opponent_id})
        .execute()
    )
    debate_id = debate.data[0]["id"]

    result = run_debate(user_id, req.opponent_id, req.topic)

    db.table("debate_rounds").insert(
        [
            {
                "debate_id": debate_id,
                "user_id": user_id,
                "round_type": "opening",
                "argument": result["opening"]["argument"],
                "sources": result["opening"]["sources"],
            },
            {
                "debate_id": debate_id,
                "user_id": req.opponent_id,
                "round_type": "rebuttal",
                "argument": result["rebuttal"]["argument"],
                "sources": result["rebuttal"]["sources"],
            },
        ]
    ).execute()

    profiles = (
        db.table("profiles")
        .select("id, email")
        .in_("id", [user_id, req.opponent_id])
        .execute()
    )
    profile_map = {p["id"]: p["email"] for p in profiles.data}

    return {
        "id": debate_id,
        "topic": req.topic,
        "challenger_id": user_id,
        "opponent_id": req.opponent_id,
        "challenger_email": profile_map.get(user_id),
        "opponent_email": profile_map.get(req.opponent_id),
        "rounds": [
            {"round_type": "opening",  "user_id": user_id,         **result["opening"]},
            {"round_type": "rebuttal", "user_id": req.opponent_id, **result["rebuttal"]},
        ],
    }


@router.get("")
async def list_debates(user_id: str = Depends(get_current_user)):
    db = get_db()
    debates = (
        db.table("debates")
        .select("*")
        .or_(f"challenger_id.eq.{user_id},opponent_id.eq.{user_id}")
        .order("created_at", desc=True)
        .execute()
    )
    if not debates.data:
        return []

    all_ids = list(
        {d["challenger_id"] for d in debates.data}
        | {d["opponent_id"] for d in debates.data}
    )
    profiles = db.table("profiles").select("id, email").in_("id", all_ids).execute()
    profile_map = {p["id"]: p["email"] for p in profiles.data}

    return [
        {
            **d,
            "challenger_email": profile_map.get(d["challenger_id"]),
            "opponent_email": profile_map.get(d["opponent_id"]),
        }
        for d in debates.data
    ]


@router.get("/{debate_id}")
async def get_debate(debate_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    debate = db.table("debates").select("*").eq("id", debate_id).execute()
    if not debate.data:
        raise HTTPException(404, "Debate not found.")

    d = debate.data[0]
    profiles = (
        db.table("profiles")
        .select("id, email")
        .in_("id", [d["challenger_id"], d["opponent_id"]])
        .execute()
    )
    profile_map = {p["id"]: p["email"] for p in profiles.data}

    rounds = (
        db.table("debate_rounds")
        .select("*")
        .eq("debate_id", debate_id)
        .order("created_at")
        .execute()
    )

    return {
        **d,
        "challenger_email": profile_map.get(d["challenger_id"]),
        "opponent_email": profile_map.get(d["opponent_id"]),
        "rounds": rounds.data,
    }

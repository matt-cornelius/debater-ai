import anthropic
import voyageai
from config import settings
from db import get_db

EMBED_MODEL = "voyage-3-lite"
TOP_K = 5
LLM_MODEL = "claude-sonnet-4-6"

_vo = voyageai.Client(api_key=settings.voyage_api_key)
_claude = anthropic.Anthropic(api_key=settings.anthropic_api_key)

_ROUND_INSTRUCTIONS = {
    "opening": "Write an opening statement presenting the user's position clearly with supporting arguments.",
    "rebuttal": "Write a rebuttal that directly addresses the opponent's argument while reinforcing the user's position.",
    "closing": "Write a closing argument that summarizes the strongest points and responds to the debate as a whole.",
}


def retrieve_context(user_id: str, query: str) -> list[dict]:
    query_embedding = _vo.embed([query], model=EMBED_MODEL).embeddings[0]
    result = get_db().rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": TOP_K,
        },
    ).execute()
    return result.data or []


def generate_argument(
    user_id: str,
    topic: str,
    round: str,
    opponent_argument: str | None = None,
) -> dict:
    query = f"{topic} {opponent_argument}" if opponent_argument else topic
    chunks = retrieve_context(user_id, query)

    if chunks:
        belief_block = "\n\n".join(
            f"[Source: {c.get('document_name', 'document')}]\n{c['chunk_text']}"
            for c in chunks
        )
    else:
        belief_block = "No documented positions found. Argue from general principles."

    opponent_section = (
        f"\n\nOpponent's argument:\n{opponent_argument}" if opponent_argument else ""
    )

    prompt = f"""You are a faithful spokesperson for this user in a structured debate.
Argue ONLY from the positions documented in the belief corpus below.
Do not invent positions not present in the corpus. If the corpus does not directly address the topic, briefly note that and argue from the closest related documented position.

User's documented beliefs relevant to this topic:
{belief_block}

Debate topic: {topic}{opponent_section}

Task: {_ROUND_INSTRUCTIONS[round]}
Keep the argument focused and 2–4 paragraphs."""

    response = _claude.messages.create(
        model=LLM_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    return {
        "argument": response.content[0].text,
        "sources": list({c.get("document_name", "document") for c in chunks}),
    }


def run_debate(challenger_id: str, opponent_id: str, topic: str) -> dict:
    opening = generate_argument(challenger_id, topic, "opening")
    rebuttal = generate_argument(opponent_id, topic, "rebuttal", opening["argument"])
    return {"opening": opening, "rebuttal": rebuttal}

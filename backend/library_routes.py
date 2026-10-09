"""Search the curated link catalogue. This is not full-text clinical retrieval."""
import json
from pathlib import Path
from fastapi import APIRouter, Query

router = APIRouter(prefix="/library", tags=["library"])
CATALOGUE = json.loads(
    (Path(__file__).resolve().parent.parent / "frontend/src/data/library.json").read_text(encoding="utf-8")
)


def search_catalogue(q="", category=None, limit=20):
    words = q.casefold().split()
    matches = [item for item in CATALOGUE
               if (category is None or item["category"] == category)
               and all(word in " ".join(item.get(key, "") for key in
                       ("title", "publisher", "description", "tags")).casefold()
                       for word in words)]
    return {"resources": matches[:max(1, min(limit, 50))], "total": len(matches),
            "scope": "link_metadata_only", "link_checked": "2026-10-09",
            "notice": "Further reading only. Article text was not retrieved. These results do not verify an AI answer or assess a person's health."}


@router.get("/search")
async def search(q: str = Query(default="", max_length=200),
                 category: str | None = Query(default=None, max_length=80),
                 limit: int = Query(default=20, ge=1, le=50)):
    return search_catalogue(q, category, limit)

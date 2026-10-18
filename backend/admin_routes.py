"""Admin endpoints: users management, conversations search, settings, analytics."""
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from auth_utils import require_admin
from models import AdminSettings, UpdateRoleRequest, BanRequest
from account_storage import delete_account, AccountUnavailable

router = APIRouter(prefix="/admin", tags=["admin"])


def _user_doc_to_out(u: dict) -> dict:
    return {
        "id": str(u.get("_id", u.get("id"))),
        "email": u.get("email"),
        "name": u.get("name"),
        "role": u.get("role", "user"),
        "banned": u.get("banned", False),
        "created_at": u.get("created_at"),
        "health_profile": u.get("health_profile") or {},
    }


@router.get("/users")
async def list_users(
    q: str = Query("", description="Search by email or name"),
    role: str = Query("", description="Filter by role"),
    skip: int = 0,
    limit: int = 50,
    admin=Depends(require_admin),
):
    from server import db
    filt = {}
    if q:
        safe_q = re.escape(q)
        filt["$or"] = [
            {"email": {"$regex": safe_q, "$options": "i"}},
            {"name": {"$regex": safe_q, "$options": "i"}},
        ]
    if role:
        filt["role"] = role

    total = await db.users.count_documents(filt)
    cursor = db.users.find(filt).sort("created_at", -1).skip(skip).limit(limit)
    users = []
    async for u in cursor:
        users.append(_user_doc_to_out(u))
    return {"users": users, "total": total}


@router.get("/users/{user_id}")
async def get_user(user_id: str, admin=Depends(require_admin)):
    from server import db
    try:
        u = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_doc_to_out(u)


@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, payload: UpdateRoleRequest, admin=Depends(require_admin)):
    from server import db
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if str(oid) == admin["id"] and payload.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot demote yourself")
    res = await db.users.update_one({"_id": oid}, {"$set": {"role": payload.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.patch("/users/{user_id}/ban")
async def ban_user(user_id: str, payload: BanRequest, admin=Depends(require_admin)):
    from server import db
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if str(oid) == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    res = await db.users.update_one({"_id": oid}, {"$set": {"banned": payload.banned}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    from server import db
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if str(oid) == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    try:
        deleted = await delete_account(db, oid)
    except AccountUnavailable:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True, "deleted": deleted}


@router.get("/users/{user_id}/conversations")
async def get_user_conversations(user_id: str, admin=Depends(require_admin)):
    from server import db
    convs = await db.conversations.find({"user_id": user_id}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return convs


@router.get("/conversations/{conv_id}")
async def admin_get_conversation(conv_id: str, admin=Depends(require_admin)):
    from server import db
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(2000)
    return {"conversation": conv, "messages": msgs}


@router.get("/conversations")
async def admin_search_conversations(
    q: str = Query(""),
    skip: int = 0,
    limit: int = 50,
    admin=Depends(require_admin),
):
    from server import db
    filt = {}
    if q:
        safe_q = re.escape(q)
        filt["title"] = {"$regex": safe_q, "$options": "i"}
    total = await db.conversations.count_documents(filt)
    convs = await db.conversations.find(filt, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    # Attach user emails
    user_ids = list({c["user_id"] for c in convs})
    users_map = {}
    for uid in user_ids:
        try:
            u = await db.users.find_one({"_id": ObjectId(uid)}, {"_id": 0, "email": 1, "name": 1})
            if u:
                users_map[uid] = u
        except Exception:
            pass
    for c in convs:
        c["user"] = users_map.get(c["user_id"], {})
    return {"conversations": convs, "total": total}


@router.get("/settings")
async def get_settings(admin=Depends(require_admin)):
    from server import db
    settings = await db.settings.find_one({"_id": "global"}, {"_id": 0})
    if not settings:
        settings = AdminSettings().model_dump()
        await db.settings.insert_one({"_id": "global", **settings})
    return settings


@router.put("/settings")
async def update_settings(payload: AdminSettings, admin=Depends(require_admin)):
    from server import db
    data = payload.model_dump()
    await db.settings.update_one({"_id": "global"}, {"$set": data}, upsert=True)
    return {"ok": True, "settings": data}


@router.get("/analytics")
async def analytics(admin=Depends(require_admin)):
    from server import db
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()

    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    banned_users = await db.users.count_documents({"banned": True})
    total_conversations = await db.conversations.count_documents({})
    total_messages = await db.messages.count_documents({})
    msgs_7d = await db.messages.count_documents({"created_at": {"$gte": seven_days_ago}})
    new_users_7d = 0
    cutoff = now - timedelta(days=7)
    async for u in db.users.find({}, {"created_at": 1}):
        ca = u.get("created_at")
        if isinstance(ca, datetime):
            if ca.tzinfo is None:
                ca = ca.replace(tzinfo=timezone.utc)
            if ca >= cutoff:
                new_users_7d += 1

    # Top models used
    pipeline = [
        {"$match": {"role": "assistant"}},
        {"$group": {"_id": "$model", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    model_counts = []
    async for doc in db.messages.aggregate(pipeline):
        model_counts.append({"model": doc["_id"], "count": doc["count"]})

    # Daily activity last 30 days
    daily = {}
    async for m in db.messages.find({"created_at": {"$gte": thirty_days_ago}}, {"created_at": 1}):
        ca = m.get("created_at")
        if isinstance(ca, str) and len(ca) >= 10:
            day = ca[:10]
            daily[day] = daily.get(day, 0) + 1
    daily_series = [{"date": d, "count": c} for d, c in sorted(daily.items())]

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "banned_users": banned_users,
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "messages_last_7_days": msgs_7d,
        "new_users_last_7_days": new_users_7d,
        "model_usage": model_counts,
        "daily_activity": daily_series,
    }

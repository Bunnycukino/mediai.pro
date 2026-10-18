"""Atomic account/chat writes. No provider calls or external side effects in transactions."""
from datetime import datetime, timezone


class AccountUnavailable(Exception):
    pass


class ConversationUnavailable(Exception):
    pass


async def transaction(db, operation):
    async with await db.client.start_session() as session:
        return await session.with_transaction(operation)


async def touch_account(db, user_oid, session):
    # All chat writers contend with account deletion on this same document.
    result = await db.users.update_one(
        {"_id": user_oid, "banned": {"$ne": True}},
        {"$inc": {"chat_write_revision": 1}}, session=session)
    if not result.matched_count:
        raise AccountUnavailable()


def owner_filter(user_oid):
    return {"user_id": {"$in": [str(user_oid), user_oid]}}


async def create_chat(db, user_oid, title, model):
    async def operation(session):
        await touch_account(db, user_oid, session)
        now = datetime.now(timezone.utc)
        doc = {"user_id": str(user_oid), "title": title or "New chat", "model": model,
               "created_at": now, "updated_at": now}
        result = await db.conversations.insert_one(doc, session=session)
        doc["_id"] = result.inserted_id
        return doc
    return await transaction(db, operation)


async def store_user_turn(db, user_oid, conv_oid, text, model, language):
    async def operation(session):
        await touch_account(db, user_oid, session)
        now = datetime.now(timezone.utc)
        if conv_oid is not None:
            conversation = await db.conversations.find_one(
                {"_id": conv_oid, **owner_filter(user_oid)}, session=session)
            if not conversation:
                raise ConversationUnavailable()
            conversation_id = conversation["_id"]
        else:
            conversation = {"user_id": str(user_oid), "title": text[:50] or "New chat",
                            "model": model, "language": language, "created_at": now,
                            "updated_at": now}
            inserted = await db.conversations.insert_one(conversation, session=session)
            conversation_id = inserted.inserted_id
        message = {"conversation_id": str(conversation_id), "user_id": str(user_oid),
                   "role": "user", "content": text, "created_at": now}
        inserted = await db.messages.insert_one(message, session=session)
        message["_id"] = inserted.inserted_id
        # Use the latest context, including the just-written message.
        history = await db.messages.find(
            {"conversation_id": str(conversation_id)}, session=session
        ).sort("created_at", -1).limit(50).to_list(50)
        history.reverse()
        return str(conversation_id), message, history
    return await transaction(db, operation)


async def store_assistant_turn(db, user_oid, conv_oid, reply, model, language, reading):
    async def operation(session):
        await touch_account(db, user_oid, session)
        conversation = await db.conversations.find_one(
            {"_id": conv_oid, **owner_filter(user_oid)}, session=session)
        if not conversation:
            raise ConversationUnavailable()
        now = datetime.now(timezone.utc)
        message = {"conversation_id": str(conv_oid), "user_id": str(user_oid),
                   "role": "assistant", "content": reply, "model": model,
                   "further_reading": reading, "created_at": now}
        inserted = await db.messages.insert_one(message, session=session)
        message["_id"] = inserted.inserted_id
        await db.conversations.update_one(
            {"_id": conv_oid}, {"$set": {"updated_at": now, "model": model,
                                       "language": language}}, session=session)
        return message
    return await transaction(db, operation)


async def delete_chat(db, user_oid, conv_oid):
    async def operation(session):
        await touch_account(db, user_oid, session)
        conversation = await db.conversations.find_one(
            {"_id": conv_oid, **owner_filter(user_oid)}, session=session)
        if not conversation:
            raise ConversationUnavailable()
        identifiers = [conv_oid, str(conv_oid)]
        if conversation.get("id"):
            identifiers.append(conversation["id"])
        await db.messages.delete_many({"conversation_id": {"$in": identifiers},
            "$or": [owner_filter(user_oid), {"user_id": None}]}, session=session)
        await db.conversations.delete_one({"_id": conv_oid}, session=session)
    return await transaction(db, operation)


async def delete_account(db, user_oid):
    async def operation(session):
        if not await db.users.find_one({"_id": user_oid}, session=session):
            raise AccountUnavailable()
        # Retain conversation ownership until every dependent message is removed.
        identifiers = []
        async for conversation in db.conversations.find(
                owner_filter(user_oid), {"_id": 1, "id": 1}, session=session):
            identifiers.extend([conversation["_id"], str(conversation["_id"])])
            if conversation.get("id"):
                identifiers.append(conversation["id"])
        deleted_messages = await db.messages.delete_many(
            {"$or": [owner_filter(user_oid),
                     {"conversation_id": {"$in": identifiers}, "user_id": None}]},
            session=session)
        deleted_conversations = await db.conversations.delete_many(owner_filter(user_oid), session=session)
        deleted_profiles = await db.profiles.delete_many(owner_filter(user_oid), session=session)
        deleted_users = await db.users.delete_one({"_id": user_oid}, session=session)
        return {"users": deleted_users.deleted_count, "conversations": deleted_conversations.deleted_count,
                "messages": deleted_messages.deleted_count, "profiles": deleted_profiles.deleted_count}
    return await transaction(db, operation)

"""Synthetic storage tests only: no network, real users or database credentials."""
import copy
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
import unittest

from account_storage import (delete_account, delete_chat, store_user_turn, store_assistant_turn,
                             create_chat, AccountUnavailable, ConversationUnavailable)


@dataclass(frozen=True)
class Identifier:
    value: str

    def __str__(self):
        return self.value


def matches(document, query):
    for key, expected in query.items():
        if key == "$or":
            if not any(matches(document, option) for option in expected):
                return False
        elif isinstance(expected, dict):
            value = document.get(key)
            if "$in" in expected and value not in expected["$in"]:
                return False
            if "$ne" in expected and value == expected["$ne"]:
                return False
        elif document.get(key) != expected:
            return False
    return True


class Cursor:
    def __init__(self, documents):
        self.documents = copy.deepcopy(documents)

    def sort(self, key, direction):
        self.documents.sort(key=lambda item: item[key], reverse=direction < 0)
        return self

    def limit(self, size):
        self.documents = self.documents[:size]
        return self

    async def to_list(self, size):
        return copy.deepcopy(self.documents[:size])

    def __aiter__(self):
        self.iterator = iter(self.documents)
        return self

    async def __anext__(self):
        try:
            return next(self.iterator)
        except StopIteration:
            raise StopAsyncIteration


class Collection:
    def __init__(self, database, name):
        self.database, self.name, self.documents = database, name, []

    def guard(self, session):
        assert session.active, "Every storage operation must join the transaction"

    async def find_one(self, query, session=None):
        self.guard(session)
        return next((copy.deepcopy(item) for item in self.documents if matches(item, query)), None)

    def find(self, query, projection=None, session=None):
        self.guard(session)
        return Cursor([item for item in self.documents if matches(item, query)])

    async def insert_one(self, document, session=None):
        self.guard(session)
        document = copy.deepcopy(document)
        document.setdefault("_id", Identifier(f"generated-{self.name}-{len(self.documents)}"))
        self.documents.append(document)
        return SimpleNamespace(inserted_id=document["_id"])

    async def update_one(self, query, update, session=None):
        self.guard(session)
        for item in self.documents:
            if matches(item, query):
                item.update(update.get("$set", {}))
                for key, increment in update.get("$inc", {}).items():
                    item[key] = item.get(key, 0) + increment
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    async def delete_many(self, query, session=None):
        self.guard(session)
        if self.database.fail_collection == self.name:
            raise RuntimeError("Synthetic storage failure")
        retained = [item for item in self.documents if not matches(item, query)]
        count = len(self.documents) - len(retained)
        self.documents = retained
        return SimpleNamespace(deleted_count=count)

    async def delete_one(self, query, session=None):
        self.guard(session)
        for position, item in enumerate(self.documents):
            if matches(item, query):
                del self.documents[position]
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)


class Session:
    def __init__(self, database):
        self.database, self.active = database, False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def with_transaction(self, operation):
        snapshot = self.database.snapshot()
        self.active = True
        try:
            return await operation(self)
        except BaseException:
            for name, documents in snapshot.items():
                getattr(self.database, name).documents = documents
            raise
        finally:
            self.active = False


class Database:
    names = ("users", "conversations", "messages", "profiles")

    def __init__(self):
        self.client, self.fail_collection = self, None
        for name in self.names:
            setattr(self, name, Collection(self, name))

    async def start_session(self):
        return Session(self)

    def snapshot(self):
        return {name: copy.deepcopy(getattr(self, name).documents) for name in self.names}


class AccountStorageTests(unittest.TestCase):
    def _callTestMethod(self, method):
        # Fake database awaits finish inline. Drive them without an event-loop
        # socketpair, so these offline tests also run in network-isolated sandboxes.
        coroutine = method()
        try:
            coroutine.send(None)
        except StopIteration:
            return
        finally:
            coroutine.close()
        self.fail("The synthetic database unexpectedly requested real asynchronous I/O")

    def setUp(self):
        self.db = Database()
        self.user, self.other = Identifier("owner"), Identifier("other")
        self.chat, self.other_chat = Identifier("chat"), Identifier("other-chat")
        self.db.users.documents = [{"_id": self.user}, {"_id": self.other}]
        self.db.conversations.documents = [
            {"_id": self.chat, "id": "legacy-uuid", "user_id": str(self.user)},
            {"_id": self.other_chat, "user_id": str(self.other)}]
        self.db.messages.documents = [
            {"_id": "old", "conversation_id": str(self.chat)},
            {"_id": "legacy", "conversation_id": "legacy-uuid"},
            {"_id": "typed", "conversation_id": self.chat},
            {"_id": "new", "user_id": str(self.user), "conversation_id": "missing-chat"},
            {"_id": "other", "conversation_id": str(self.other_chat), "user_id": str(self.other)},
            {"_id": "mislinked-other", "conversation_id": str(self.chat), "user_id": str(self.other)}]
        self.db.profiles.documents = [{"user_id": self.user}, {"user_id": str(self.other)}]

    async def test_cascade_removes_legacy_and_current_records_only(self):
        deleted = await delete_account(self.db, self.user)
        self.assertEqual(deleted, {"users": 1, "conversations": 1, "messages": 4, "profiles": 1})
        self.assertEqual(self.db.users.documents, [{"_id": self.other}])
        self.assertEqual([item["_id"] for item in self.db.messages.documents], ["other", "mislinked-other"])
        self.assertEqual(self.db.profiles.documents, [{"user_id": str(self.other)}])

    async def test_failure_rolls_back_account_and_all_dependents(self):
        before = self.db.snapshot()
        self.db.fail_collection = "profiles"
        with self.assertRaises(RuntimeError):
            await delete_account(self.db, self.user)
        self.assertEqual(self.db.snapshot(), before)

    async def test_missing_account_does_not_remove_anything(self):
        before = self.db.snapshot()
        with self.assertRaises(AccountUnavailable):
            await delete_account(self.db, Identifier("missing"))
        self.assertEqual(self.db.snapshot(), before)

    async def test_banned_account_cannot_write_new_messages(self):
        self.db.users.documents[0]["banned"] = True
        before = self.db.snapshot()
        with self.assertRaises(AccountUnavailable):
            await store_user_turn(self.db, self.user, None, "test", "test", "en")
        self.assertEqual(self.db.snapshot(), before)

    async def test_late_ai_response_cannot_recreate_deleted_account_data(self):
        await delete_account(self.db, self.user)
        before = self.db.snapshot()
        with self.assertRaises(AccountUnavailable):
            await store_assistant_turn(self.db, self.user, self.chat, "synthetic reply", "test", "en", [])
        self.assertEqual(self.db.snapshot(), before)

    async def test_late_user_request_cannot_create_a_chat_after_account_deletion(self):
        await delete_account(self.db, self.user)
        with self.assertRaises(AccountUnavailable):
            await create_chat(self.db, self.user, "test", "test")

    async def test_deleted_conversation_cannot_be_recreated_by_late_response(self):
        await delete_chat(self.db, self.user, self.chat)
        before = self.db.snapshot()
        with self.assertRaises(ConversationUnavailable):
            await store_assistant_turn(self.db, self.user, self.chat, "synthetic reply", "test", "en", [])
        self.assertEqual(self.db.snapshot(), before)

    async def test_other_users_conversation_is_protected(self):
        before = self.db.snapshot()
        with self.assertRaises(ConversationUnavailable):
            await delete_chat(self.db, self.user, self.other_chat)
        self.assertEqual(self.db.snapshot(), before)

    async def test_new_messages_have_owner_and_library_metadata(self):
        conv_id, user_message, history = await store_user_turn(
            self.db, self.user, None, "synthetic test", "test", "en")
        self.assertEqual(user_message["user_id"], str(self.user))
        self.assertEqual(history[-1]["content"], "synthetic test")
        reading = [{"id": "test-resource"}]
        reply = await store_assistant_turn(self.db, self.user, Identifier(conv_id), "reply", "test", "en", reading)
        self.assertEqual(reply["user_id"], str(self.user))
        self.assertEqual(reply["further_reading"], reading)

    async def test_latest_context_includes_new_question_after_50_messages(self):
        start = datetime.now(timezone.utc) - timedelta(days=1)
        self.db.messages.documents = [{"_id": f"history-{i}", "conversation_id": str(self.chat),
            "created_at": start + timedelta(seconds=i), "role": "user", "content": str(i)} for i in range(60)]
        _, _, history = await store_user_turn(self.db, self.user, self.chat, "latest question", "test", "en")
        self.assertEqual(len(history), 50)
        self.assertEqual(history[-1]["content"], "latest question")
        self.assertEqual(history[0]["content"], "11")


if __name__ == "__main__":
    unittest.main()

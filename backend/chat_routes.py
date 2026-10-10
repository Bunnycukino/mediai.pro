"""Multi-LLM chat - Groq (primary, free) + Gemini + OpenAI fallback."""
import os
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from auth_utils import get_current_user
from models import ChatRequest, ConversationCreate

router = APIRouter(prefix="/chat", tags=["chat"])

# Groq is primary - free, fast, no daily quota exhaustion
# Gemini as fallback, OpenAI as last resort
MODEL_PROVIDERS = {
    "gpt-oss-120b": ("groq", "openai/gpt-oss-120b"),
    "gpt-oss-20b": ("groq", "openai/gpt-oss-20b"),
    "gpt-4o-mini": ("openai", "gpt-4o-mini"),
}
DEFAULT_MODEL = "gpt-oss-120b"
LEGACY_MODELS = {"llama-3.3-70b": DEFAULT_MODEL, "llama-3.3-70b-versatile": DEFAULT_MODEL,
                 "llama-3.1-8b": "gpt-oss-20b", "llama-3.1-8b-instant": "gpt-oss-20b"}


def resolve_model(model):
    key = LEGACY_MODELS.get(model, model)
    return key if key in MODEL_PROVIDERS else DEFAULT_MODEL

LANGUAGES = {
    "en": "English", "es": "Spanish", "fr": "French", "de": "German",
    "it": "Italian", "pt": "Portuguese", "ru": "Russian", "ar": "Arabic",
    "zh": "Chinese", "hi": "Hindi", "ja": "Japanese", "ko": "Korean",
    "tr": "Turkish", "pl": "Polish", "nl": "Dutch",
}


def is_valid_object_id(oid: str) -> bool:
    try:
        ObjectId(oid)
        return True
    except (InvalidId, Exception):
        return False


def build_system_prompt(profile: dict, language: str, extra: str = "") -> str:
    lang_name = LANGUAGES.get(language, "English")
    profile_summary = ""
    if profile:
        bits = []
        if profile.get("age"): bits.append(f"Age: {profile['age']}")
        if profile.get("sex"): bits.append(f"Sex: {profile['sex']}")
        if profile.get("height_cm"): bits.append(f"Height: {profile['height_cm']} cm")
        if profile.get("weight_kg"): bits.append(f"Weight: {profile['weight_kg']} kg")
        if profile.get("conditions"): bits.append(f"Conditions: {', '.join(profile['conditions'])}")
        if profile.get("medications"): bits.append(f"Medications: {', '.join(profile['medications'])}")
        if profile.get("allergies"): bits.append(f"Allergies: {', '.join(profile['allergies'])}")
        if bits:
            profile_summary = "Patient profile: " + "; ".join(bits) + "."
    prompt = f"""You are MediAI, an educational health information assistant.
Always respond in {lang_name}.
Provide accurate, evidence-based medical information.
Always recommend consulting a healthcare professional for diagnosis and treatment.
Be compassionate and clear.
You are not a doctor. You cannot diagnose or rule out serious illness.
Do not claim to have consulted library articles or verified sources unless they were actually provided.
Do not advise delaying care or changing prescribed treatment. For a life-threatening emergency in the UK, advise calling 999 or 112 immediately.
{profile_summary}
{extra}"""
    return prompt


async def call_groq(model_id: str, messages: list, system_prompt: str) -> str:
    """Call Groq API - free tier, very fast, uses OpenAI-compatible SDK."""
    import openai
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")
    client = openai.AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = await client.chat.completions.create(
        model=model_id,
        messages=full_messages,
        max_tokens=2048,
        reasoning_effort="low",
    )
    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=502, detail="AI returned an empty answer. Please retry.")
    return content


async def call_gemini(model_id: str, messages: list, system_prompt: str) -> str:
    """Call Gemini API."""
    import google.genai as genai
    from google.genai import types
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    client = genai.Client(api_key=api_key)
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=1500,
    )
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=model_id,
            contents=contents,
            config=config,
        )
    )
    return response.text


async def call_openai(model_id: str, messages: list, system_prompt: str) -> str:
    """Call OpenAI API."""
    import openai
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    client = openai.AsyncOpenAI(api_key=api_key)
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    response = await client.chat.completions.create(
        model=model_id,
        messages=full_messages,
        max_tokens=1500,
    )
    return response.choices[0].message.content


@router.get("/models")
async def list_models(user: dict = Depends(get_current_user)):
    from server import db
    settings = await db.settings.find_one({"_id": "global"}) or {}
    models_list = [
        {"id": k, "name": k, "provider": v[0]}
        for k, v in MODEL_PROVIDERS.items()
    ]
    return {
        "models": models_list,
        "default": resolve_model(settings.get("default_model")),
        "languages": [{"code": k, "name": v} for k, v in LANGUAGES.items()],
    }


@router.get("/conversations")
async def get_conversations(user: dict = Depends(get_current_user)):
    from server import db
    uid = str(user["id"])
    convs = await db.conversations.find(
        {"user_id": uid}
    ).sort("updated_at", -1).to_list(50)
    for c in convs:
        c["_id"] = str(c["_id"])
    return convs


@router.post("/conversations")
async def create_conversation(data: ConversationCreate, user: dict = Depends(get_current_user)):
    from server import db
    uid = str(user["id"])
    doc = {
        "user_id": uid,
        "title": data.title or "New consultation",
        "model": resolve_model(data.model),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.conversations.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc


@router.get("/conversations/{conv_id}")
async def get_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    from server import db
    uid = str(user["id"])
    if not is_valid_object_id(conv_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv = await db.conversations.find_one({"_id": ObjectId(conv_id), "user_id": uid})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv["_id"] = str(conv["_id"])
    messages = await db.messages.find({"conversation_id": conv_id}).sort("created_at", 1).to_list(200)
    for m in messages:
        m["_id"] = str(m["_id"])
    return {"conversation": conv, "messages": messages}


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user: dict = Depends(get_current_user)):
    from server import db
    uid = str(user["id"])
    if not is_valid_object_id(conv_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    result = await db.conversations.delete_one({"_id": ObjectId(conv_id), "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.messages.delete_many({"conversation_id": conv_id})
    return {"ok": True}


@router.post("/send")
async def send_message(request: ChatRequest, user: dict = Depends(get_current_user)):
    from server import db
    uid = str(user["id"])
    model_key = resolve_model(request.model)
    provider, model_id = MODEL_PROVIDERS[model_key]

    # Get or create conversation
    conv_id = request.conversation_id
    if conv_id and is_valid_object_id(conv_id):
        conv = await db.conversations.find_one({"_id": ObjectId(conv_id), "user_id": uid})
        if not conv:
            conv_id = None
    else:
        conv_id = None

    if not conv_id:
        title = request.message[:50] if request.message else "New consultation"
        doc = {
            "user_id": uid,
            "title": title,
            "model": model_key,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.conversations.insert_one(doc)
        conv_id = str(result.inserted_id)

    # Save user message
    user_msg = {
        "conversation_id": conv_id,
        "role": "user",
        "content": request.message,
        "created_at": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(user_msg)

    # Build message history
    history = await db.messages.find({"conversation_id": conv_id}).sort("created_at", 1).to_list(50)
    messages = [{"role": m["role"], "content": m["content"]} for m in history]

    # Get user profile
    profile_doc = await db.profiles.find_one({"user_id": uid}) or {}
    profile = profile_doc.get("data", {})
    system_prompt = build_system_prompt(profile, request.language or "en")

    # Call AI
    try:
        if provider == "groq":
            reply = await call_groq(model_id, messages, system_prompt)
        elif provider == "gemini":
            reply = await call_gemini(model_id, messages, system_prompt)
        else:
            reply = await call_openai(model_id, messages, system_prompt)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)[:300]}")

    # Save assistant message
    assistant_msg = {
        "conversation_id": conv_id,
        "role": "assistant",
        "content": reply,
        "model": model_key,
        "created_at": datetime.now(timezone.utc),
    }
    await db.messages.insert_one(assistant_msg)

    if is_valid_object_id(conv_id):
        await db.conversations.update_one(
            {"_id": ObjectId(conv_id)},
            {"$set": {"updated_at": datetime.now(timezone.utc), "title": messages[0]["content"][:50] if messages else "Consultation"}}
        )

    assistant_msg["_id"] = str(assistant_msg.get("_id", ""))
    return {"reply": reply, "conversation_id": conv_id, "message": assistant_msg}

"""Pydantic models for SusStyle AI Medical Helper."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "user"
    created_at: Optional[datetime] = None
    banned: bool = False


class HealthProfile(BaseModel):
    age: Optional[int] = None
    sex: Optional[Literal["male", "female", "other", "prefer_not_to_say"]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_type: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    current_medications: List[str] = []
    family_history: List[str] = []
    smoking: Optional[Literal["never", "former", "current"]] = None
    alcohol: Optional[Literal["never", "occasional", "regular", "heavy"]] = None
    notes: Optional[str] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = "New consultation"
    model: str = "gpt-oss-120b"
    language: str = "en"


class ConversationOut(BaseModel):
    id: str
    user_id: str
    title: str
    model: str
    language: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class MessageIn(BaseModel):
    content: str
    model: Optional[str] = None
    language: Optional[str] = None


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system"]
    content: str
    model: Optional[str] = None
    sources: List[dict] = []
    created_at: datetime


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    model: str = "gpt-oss-120b"
    language: str = "en"


class TTSRequest(BaseModel):
    text: str
    voice: str = "sage"


class AdminSettings(BaseModel):
    enabled_models: List[str] = [
        "gpt-oss-120b", "gpt-4o",
        "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001",
        "gemini-2.5-pro", "gemini-2.5-flash",
    ]
    default_model: str = "gpt-oss-120b"
    disclaimer_text: str = (
        "This AI medical assistant provides general health information for educational purposes only. "
        "It is not a substitute for professional medical advice, diagnosis, or treatment. "
        "Always seek the advice of your physician or other qualified health provider with any "
        "questions you may have regarding a medical condition. In case of emergency, call your "
        "local emergency services immediately."
    )
    system_prompt_extra: str = ""
    voice_enabled: bool = True
    max_history_messages: int = 20


class UpdateRoleRequest(BaseModel):
    role: Literal["user", "admin"]


class BanRequest(BaseModel):
    banned: bool

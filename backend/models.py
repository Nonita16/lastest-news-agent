from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime


class UserPreferences(BaseModel):
    tone: Optional[Literal["formal", "casual", "enthusiastic"]] = None
    format: Optional[Literal["bullet points", "paragraphs"]] = None
    language: Optional[str] = None
    interaction_style: Optional[Literal["concise", "detailed"]] = None
    topics: Optional[List[str]] = None

    def is_complete(self) -> bool:
        return all([
            self.tone is not None,
            self.format is not None,
            self.language is not None,
            self.interaction_style is not None,
            self.topics is not None and len(self.topics) > 0
        ])

    def get_missing_preferences(self) -> List[str]:
        missing = []
        if self.tone is None:
            missing.append("tone of voice (formal, casual, or enthusiastic)")
        if self.format is None:
            missing.append("response format (bullet points or paragraphs)")
        if self.language is None:
            missing.append("preferred language")
        if self.interaction_style is None:
            missing.append("interaction style (concise or detailed)")
        if self.topics is None or len(self.topics) == 0:
            missing.append("news topics of interest")
        return missing


class ToolCall(BaseModel):
    name: str
    arguments: Dict[str, Any]
    result: Optional[Any] = None


class QuickReplyOption(BaseModel):
    label: str
    value: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)
    tool_calls: Optional[List[ToolCall]] = None
    quick_reply_options: Optional[List[QuickReplyOption]] = None
    is_preference_question: bool = False
    preference_type: Optional[str] = None
    selection_type: Optional[Literal["single", "multiple"]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    preferences: Optional[UserPreferences] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: ChatMessage
    preferences: UserPreferences
    conversation_id: str
    requires_tool: bool = False


class Session(BaseModel):
    session_id: str
    conversation_id: str
    messages: List[ChatMessage]
    preferences: Optional[UserPreferences]
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ErrorResponse(BaseModel):
    detail: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.now)

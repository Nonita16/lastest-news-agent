from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import json
from datetime import datetime
from ..models import ChatRequest
from ..agent import NewsAgent
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Store agent instances per conversation
agents = {}

# Non-streaming endpoint removed - use /stream for all chat interactions


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Stream chat responses using Server-Sent Events"""
    logger.info(
        f"🌊 Received stream request - Message: '{request.message}', "
        f"Conversation: {request.conversation_id}"
    )

    try:
        # Get or create agent for this conversation
        if request.conversation_id not in agents:
            agents[request.conversation_id] = NewsAgent()
            logger.info(
                f"Created new agent for streaming conversation: "
                f"{request.conversation_id}"
            )
        else:
            logger.info(
                f"Using existing agent for streaming conversation: "
                f"{request.conversation_id}"
            )

        agent = agents[request.conversation_id]

        # Update preferences if provided
        if request.preferences:
            agent.preferences = request.preferences

        async def generate() -> AsyncGenerator[str, None]:
            try:
                # Check if this is a preference-related message
                # that should be handled immediately
                if (request.message == "__INIT_CONVERSATION__" or
                        request.message.startswith("PREFERENCE_SELECTION:")):

                    # Use non-streaming method for preference collection
                    response_message = await agent.process_message(
                        message=request.message,
                        preferences=request.preferences
                    )

                    # Send complete message with quick reply options
                    message_dict = response_message.model_dump()
                    # Convert datetime to ISO string for JSON serialization
                    if isinstance(message_dict.get('timestamp'), datetime):
                        message_dict['timestamp'] = (
                            message_dict['timestamp'].isoformat()
                        )

                    complete_data = json.dumps({
                        "type": "complete_message",
                        "message": message_dict,
                        "preferences": (
                            agent.preferences.model_dump()
                            if agent.preferences else None
                        ),
                        "conversation_id": request.conversation_id
                    })
                    yield f"data: {complete_data}\n\n"
                    return

                # Regular streaming for non-preference messages
                async for chunk in agent.process_message_stream(
                    message=request.message,
                    preferences=request.preferences
                ):
                    data = json.dumps({
                        "type": "chunk",
                        "content": chunk,
                        "conversation_id": request.conversation_id
                    })
                    yield f"data: {data}\n\n"

                # Send final message with preferences
                final_data = json.dumps({
                    "type": "complete",
                    "preferences": (
                        agent.preferences.model_dump()
                        if agent.preferences else None
                    ),
                    "conversation_id": request.conversation_id
                })
                yield f"data: {final_data}\n\n"

            except Exception as e:
                error_data = json.dumps({
                    "type": "error",
                    "error": str(e)
                })
                yield f"data: {error_data}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        logger.error(f"Error in stream endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}/preferences")
async def get_preferences(conversation_id: str):
    """Get current preferences for a conversation"""
    if conversation_id not in agents:
        return {"preferences": None}

    agent = agents[conversation_id]
    return {
        "preferences": (
            agent.preferences.model_dump() if agent.preferences else None
        ),
        "is_complete": (
            agent.preferences.is_complete() if agent.preferences else False
        ),
        "missing": (
            agent.preferences.get_missing_preferences()
            if agent.preferences else []
        )
    }
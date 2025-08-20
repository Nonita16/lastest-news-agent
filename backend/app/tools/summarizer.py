from typing import List, Dict, Any
from ..models import UserPreferences
import logging
import os
import asyncio
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class NewsSummarizer:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        self.async_client = AsyncOpenAI(api_key=api_key)

    async def summarize_async(self, articles: List[Dict[str, Any]],
                             preferences: UserPreferences) -> str:
        """Async summarize articles based on user preferences using OpenAI"""
        if not articles:
            logger.warning("No articles provided for summarization")
            return "No articles available to summarize."
        
        logger.info(
            f"Summarizing {len(articles)} articles with preferences: "
            f"{preferences.model_dump()}"
        )
        
        try:
            return await self._async_summarize(articles, preferences)
        except Exception as e:
            logger.error(f"Error in OpenAI summarization: {e}")
            return f"Sorry, I encountered an error while summarizing the news: {str(e)}"

    def summarize(self, articles: List[Dict[str, Any]],
                  preferences: UserPreferences) -> str:
        """Sync wrapper for backward compatibility"""
        return asyncio.run(self.summarize_async(articles, preferences))

    async def _async_summarize(self, articles: List[Dict[str, Any]], preferences: UserPreferences) -> str:
        """Async method to summarize using OpenAI"""
        # Prepare articles text for OpenAI
        articles_text = ""
        for i, article in enumerate(articles, 1):
            title = article.get("title", "Untitled")
            content = article.get("content", "")[:1000]  # Limit content length
            url = article.get("url", "")
            articles_text += f"Article {i}: {title}\nContent: {content}\nURL: {url}\n\n"
        
        # Build system prompt based on preferences
        language = preferences.language or "English"
        tone_map = {
            "formal": "professional and formal",
            "casual": "friendly and conversational", 
            "enthusiastic": "energetic and exciting"
        }
        tone_instruction = tone_map.get(preferences.tone, "neutral")
        
        format_instruction = "bullet points" if preferences.format == "bullet points" else "paragraph format"
        detail_level = "detailed" if preferences.interaction_style == "detailed" else "concise"
        
        system_prompt = f"""You are a news summarizer. Create a complete news summary in {language} with the following requirements:

- Write in a {tone_instruction} tone
- Format the response in {format_instruction}
- Provide a {detail_level} level of information
- Language: ALL content must be in {language} (not English unless {language} is English)
- Include relevant links and dates when available
- Use markdown formatting for headers and links
- Include an appropriate greeting and closing based on the {tone_instruction} tone
- Create a complete, standalone news summary

Summarize the following news articles:"""

        try:
            response = await self.async_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": articles_text}
                ],
                temperature=0.7,
                max_tokens=1500,
                timeout=30.0  # 30 second timeout
            )
            
            summary = response.choices[0].message.content or ""
            logger.info(f"OpenAI generated summary length: {len(summary)} characters")
            return summary
            
        except Exception as e:
            logger.error(f"OpenAI summarization failed: {e}")
            # Return a more user-friendly error message
            return f"I'm having trouble connecting to the news service right now. Please try again in a moment."
    

    def apply_language_adjustments(self, summary: str,
                                   language: str) -> str:
        """Apply language-specific adjustments"""
        # Language is now handled directly by OpenAI through system prompt
        # No additional processing needed here
        return summary
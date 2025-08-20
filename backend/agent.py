import os
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from openai import AsyncOpenAI
from .models import (
    UserPreferences, ChatMessage, ToolCall, QuickReplyOption
)
from .tools.exa_fetcher import ExaNewsFetcher
from .tools.summarizer import NewsSummarizer
from .preference_collector import PreferenceCollector
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class NewsAgent:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is required "
                "but not found"
            )

        logger.info(f"OpenAI API key configured: {api_key[:10]}...")
        self.async_client = AsyncOpenAI(api_key=api_key)

        self.exa_fetcher = ExaNewsFetcher()
        self.summarizer = NewsSummarizer()
        self.preferences = UserPreferences()
        self.conversation_history: List[ChatMessage] = []
        self.preference_collector = PreferenceCollector()

    async def process_message(
            self, message: str,
            preferences: Optional[UserPreferences] = None
    ) -> ChatMessage:
        """Process a message and return response.

        Used for preference collection in streaming mode.
        """
        if preferences:
            self.preferences = preferences

        # Check if this is an initialization message
        if message == "__INIT_CONVERSATION__":
            # Don't add this to conversation history, just trigger
            # preference collection
            if not self.preferences.is_complete():
                next_question = (
                    self.preference_collector.get_next_preference_question(
                        self.preferences
                    )
                )
                if next_question:
                    quick_reply_opts = [
                        QuickReplyOption(**opt)
                        for opt in next_question['quick_reply_options']
                    ]
                    response_message = ChatMessage(
                        role="assistant",
                        content=next_question['message'],
                        quick_reply_options=quick_reply_opts,
                        is_preference_question=(
                            next_question['is_preference_question']
                        ),
                        preference_type=next_question['preference_type'],
                        selection_type=next_question['selection_type']
                    )
                    self.conversation_history.append(response_message)
                    return response_message
            else:
                welcome_msg = (
                    self.preference_collector.get_welcome_back_message(
                        self.preferences
                    )
                )
                response_message = ChatMessage(
                    role="assistant",
                    content=welcome_msg
                )
                self.conversation_history.append(response_message)
                return response_message

        # Check if this is a preference selection from quick reply
        if message.startswith("PREFERENCE_SELECTION:"):
            # Parse preference selection
            parts = message.replace("PREFERENCE_SELECTION:", "").split(":")
            if len(parts) == 2:
                pref_type, value = parts
                self.preferences = (
                    self.preference_collector.process_preference_response(
                        self.preferences, pref_type, value
                    )
                )

                # Check for next preference question
                next_question = (
                    self.preference_collector.get_next_preference_question(
                        self.preferences
                    )
                )
                if next_question:
                    quick_reply_opts = [
                        QuickReplyOption(**opt)
                        for opt in next_question['quick_reply_options']
                    ]
                    response_message = ChatMessage(
                        role="assistant",
                        content=next_question['message'],
                        quick_reply_options=quick_reply_opts,
                        is_preference_question=(
                            next_question['is_preference_question']
                        ),
                        preference_type=next_question['preference_type'],
                        selection_type=next_question['selection_type']
                    )
                    self.conversation_history.append(response_message)
                    return response_message
                else:
                    # Preferences complete
                    completion_msg = (
                        self.preference_collector.get_completion_message()
                    )
                    response_message = ChatMessage(
                        role="assistant",
                        content=completion_msg
                    )
                    self.conversation_history.append(response_message)
                    return response_message

        # Extract preferences from natural language if not using quick replies
        self._extract_preferences(message)

        # Add user message to history
        user_message = ChatMessage(
            role="user",
            content=message,
            timestamp=datetime.now()
        )
        self.conversation_history.append(user_message)

        logger.info(f"Processing regular message: {message}")
        logger.info(f"Preferences complete: {self.preferences.is_complete()}")
        logger.info(f"Current preferences: {self.preferences.model_dump()}")

        # Prepare messages for OpenAI
        messages = self._prepare_messages(message)
        logger.info(f"Prepared {len(messages)} messages for OpenAI")

        # Determine if tools are needed
        tools = (
            self._get_available_tools()
            if self.preferences.is_complete()
            else None
        )
        tool_count = len(tools) if tools else 0
        logger.info(
            f"Tools enabled: {tools is not None}, Tool count: {tool_count}"
        )
        try:
            tool_count = len(tools) if tools else 0
            logger.info(
                f"Calling OpenAI API with model: gpt-4-turbo-preview, "
                f"tools: {tool_count}"
            )
            # Call OpenAI with raw API
            response = await self.async_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                tools=tools,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=1000
            )
            logger.info("OpenAI API call successful")

            # Process response
            assistant_message = response.choices[0].message

            # Handle tool calls if present
            if assistant_message.tool_calls:
                call_count = len(assistant_message.tool_calls)
                logger.info(f"OpenAI requested {call_count} tool calls")
                for i, tool_call in enumerate(assistant_message.tool_calls):
                    logger.info(
                        f"Tool call {i+1}: {tool_call.function.name} "
                        f"with args: {tool_call.function.arguments}"
                    )

                tool_results = await self._execute_tools(
                    assistant_message.tool_calls
                )
                logger.info(
                    f"Tool execution completed, {len(tool_results)} results"
                )

                # Create response with tool results
                content = self._format_tool_response(tool_results)
                content_len = len(content)
                logger.info(
                    f"Generated response content length: "
                    f"{content_len} characters"
                )
                response_message = ChatMessage(
                    role="assistant",
                    content=content,
                    tool_calls=tool_results
                )
            else:
                logger.info("No tool calls requested by OpenAI")
                response_message = ChatMessage(
                    role="assistant",
                    content=assistant_message.content or ""
                )
                logger.info(
                    f"Direct response content: {assistant_message.content}"
                )

            self.conversation_history.append(response_message)
            return response_message
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise Exception(
                f"Failed to process message with OpenAI: {str(e)}"
            )

    async def process_message_stream(
            self, message: str,
            preferences: Optional[UserPreferences] = None
    ) -> AsyncGenerator[str, None]:
        """Process message with streaming response"""
        if preferences:
            self.preferences = preferences

        # Extract preferences from message
        self._extract_preferences(message)

        # Add user message to history
        user_message = ChatMessage(
            role="user",
            content=message,
            timestamp=datetime.now()
        )
        self.conversation_history.append(user_message)

        logger.info(f"Streaming process - message: {message}")
        logger.info(f"Preferences complete: {self.preferences.is_complete()}")
        logger.info(
            f"Current preferences for streaming: "
            f"{self.preferences.model_dump()}"
        )

        # Prepare messages for OpenAI
        messages = self._prepare_messages(message)
        logger.info(
            f"Prepared {len(messages)} messages for OpenAI streaming"
        )

        # Determine if tools are needed
        tools = (
            self._get_available_tools()
            if self.preferences.is_complete()
            else None
        )
        tool_count = len(tools) if tools else 0
        logger.info(
            f"Streaming - Tools enabled: {tools is not None}, "
            f"Tool count: {tool_count}"
        )
        try:
            logger.info("Starting OpenAI streaming call...")
            if tools:
                tool_names = [tool['function']['name'] for tool in tools]
                logger.info(f"Tools being passed to OpenAI: {tool_names}")
                logger.info(
                    f"Full tool definitions: {json.dumps(tools, indent=2)}"
                )
            else:
                logger.info("No tools being passed to OpenAI")
            # Call OpenAI with streaming
            stream = await self.async_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                tools=tools,
                tool_choice="auto" if tools else None,
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )
            logger.info("OpenAI streaming call initiated successfully")

            # Stream the response
            accumulated_content = ""
            # Track tool calls by index to properly assemble them
            tool_calls_by_index = {}
            chunk_count = 0
            async for chunk in stream:
                chunk_count += 1
                choice = chunk.choices[0]

                # Handle content streaming
                if choice.delta.content:
                    content = choice.delta.content
                    accumulated_content += content
                    yield content

                # Handle tool calls in streaming - need to assemble by index
                if choice.delta.tool_calls:
                    for tool_call_delta in choice.delta.tool_calls:
                        index = tool_call_delta.index

                        # Initialize tool call entry if not exists
                        if index not in tool_calls_by_index:
                            tool_calls_by_index[index] = {
                                'id': tool_call_delta.id or '',
                                'function': {
                                    'name': (
                                        tool_call_delta.function.name or ''
                                    ),
                                    'arguments': ''
                                },
                                'type': tool_call_delta.type or 'function'
                            }

                        # Accumulate data
                        if tool_call_delta.id:
                            tool_calls_by_index[index]['id'] = (
                                tool_call_delta.id
                            )
                        if tool_call_delta.function.name:
                            tool_calls_by_index[index]['function']['name'] = (
                                tool_call_delta.function.name
                            )
                        if tool_call_delta.function.arguments:
                            current_args = (
                                tool_calls_by_index[index]['function']
                                ['arguments']
                            )
                            tool_calls_by_index[index]['function'][
                                'arguments'
                            ] = (
                                current_args +
                                tool_call_delta.function.arguments
                            )
            content_len = len(accumulated_content)
            logger.info(
                f"Streaming completed: {chunk_count} chunks, "
                f"{content_len} total characters"
            )
            logger.info(f"Assembled tool calls: {len(tool_calls_by_index)}")
            # If we have tool calls, execute them
            if tool_calls_by_index:
                logger.info("Executing tools from streaming response...")

                # Log the assembled tool calls
                for index, tool_call in tool_calls_by_index.items():
                    func_name = tool_call['function']['name']
                    func_args = tool_call['function']['arguments']
                    logger.info(
                        f"Tool call {index}: {func_name} with args: "
                        f"{func_args}"
                    )

                # Create mock tool call objects for execution
                class MockToolCall:
                    def __init__(self, name, arguments):
                        self.function = type('obj', (object,), {
                            'name': name,
                            'arguments': arguments
                        })()

                regular_tool_calls = []
                for tool_call in tool_calls_by_index.values():
                    func_name = tool_call['function']['name']
                    func_args = tool_call['function']['arguments']
                    if func_name and func_args:
                        regular_tool_calls.append(
                            MockToolCall(func_name, func_args)
                        )
                if regular_tool_calls:
                    tool_results = await self._execute_tools(
                        regular_tool_calls
                    )
                    
                    # Create messages with tool results for OpenAI to process
                    messages_with_tools = messages.copy()
                    
                    # Add assistant message with tool calls
                    messages_with_tools.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": f"call_{i}",
                                "type": "function", 
                                "function": {
                                    "name": result.name,
                                    "arguments": json.dumps(result.arguments)
                                }
                            }
                            for i, result in enumerate(tool_results)
                        ]
                    })
                    
                    # Add tool results
                    for result in tool_results:
                        messages_with_tools.append({
                            "role": "tool",
                            "content": result.result,
                            "tool_call_id": f"call_{tool_results.index(result)}"
                        })
                    
                    # Get OpenAI's final response with tool results
                    logger.info("Getting OpenAI's final response with tool results...")
                    final_stream = await self.async_client.chat.completions.create(
                        model="gpt-4-turbo-preview",
                        messages=messages_with_tools,
                        temperature=0.7,
                        max_tokens=2000,
                        stream=True
                    )
                    
                    # Stream the final response
                    final_chunk_count = 0
                    try:
                        async for chunk in final_stream:
                            final_chunk_count += 1
                            choice = chunk.choices[0]
                            if choice.delta.content:
                                content = choice.delta.content
                                accumulated_content += content
                                yield content
                        
                        logger.info(f"Final streaming completed: {final_chunk_count} chunks, {len(accumulated_content)} total characters")
                    except Exception as e:
                        logger.error(f"Error in final streaming: {e}")
                        error_msg = f"Error occurred while generating response: {str(e)}"
                        yield error_msg
                        accumulated_content += error_msg
            # Add assistant response to conversation history
            assistant_message = ChatMessage(
                role="assistant",
                content=accumulated_content,
                timestamp=datetime.now()
            )
            self.conversation_history.append(assistant_message)
        except Exception as e:
            logger.error(f"Error in streaming: {e}")
            raise Exception(
                f"Failed to stream message with OpenAI: {str(e)}"
            )

    def _extract_preferences(self, message: str):
        """Extract preferences from user message."""
        message_lower = message.lower()

        # Tone detection
        formal_words = ["formal", "professional", "serious"]
        casual_words = ["casual", "friendly", "relaxed", "chill"]
        enthusiastic_words = ["enthusiastic", "excited", "energetic", "fun"]

        if any(word in message_lower for word in formal_words):
            self.preferences.tone = "formal"
        elif any(word in message_lower for word in casual_words):
            self.preferences.tone = "casual"
        elif any(word in message_lower for word in enthusiastic_words):
            self.preferences.tone = "enthusiastic"

        # Format detection
        bullet_words = ["bullet", "points", "list"]
        paragraph_words = ["paragraph", "essay", "prose"]

        if any(word in message_lower for word in bullet_words):
            self.preferences.format = "bullet points"
        elif any(word in message_lower for word in paragraph_words):
            self.preferences.format = "paragraphs"

        # Language detection
        languages = {
            "english": "English",
            "spanish": "Spanish",
            "french": "French",
            "german": "German",
            "italian": "Italian",
            "portuguese": "Portuguese",
            "chinese": "Chinese",
            "japanese": "Japanese"
        }
        for lang_key, lang_value in languages.items():
            if lang_key in message_lower:
                self.preferences.language = lang_value
                break

        # Style detection
        concise_words = ["concise", "brief", "short", "quick"]
        detailed_words = ["detailed", "comprehensive", "thorough", "in-depth"]

        if any(word in message_lower for word in concise_words):
            self.preferences.interaction_style = "concise"
        elif any(word in message_lower for word in detailed_words):
            self.preferences.interaction_style = "detailed"

        # Topics detection
        topic_keywords = {
            "technology": [
                "technology", "tech", "ai", "software", "computer",
                "innovation"
            ],
            "sports": [
                "sports", "football", "basketball", "soccer", "tennis",
                "athletics"
            ],
            "politics": [
                "politics", "political", "government", "election", "policy"
            ],
            "science": [
                "science", "scientific", "research", "discovery", "study"
            ],
            "business": [
                "business", "finance", "economy", "market", "stocks",
                "trade"
            ],
            "entertainment": [
                "entertainment", "movies", "music", "celebrity", "culture"
            ],
            "health": [
                "health", "medicine", "wellness", "fitness", "medical"
            ]
        }
        detected_topics = []
        for topic, keywords in topic_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                detected_topics.append(topic)

        if detected_topics:
            self.preferences.topics = detected_topics

        logger.info(f"Extracted preferences: {self.preferences}")

    def _prepare_messages(self, current_message: str) -> List[Dict[str, Any]]:
        """Prepare messages for OpenAI API."""
        # Build base system content
        system_content = (
            "You are a helpful news assistant that collects user "
            "preferences and provides personalized news summaries.\n\n"
            "Your task is to:\n"
            "1. Collect 5 specific preferences from the user:\n"
            "   - Tone of voice (formal, casual, or enthusiastic)\n"
            "   - Response format (bullet points or paragraphs)\n"
            "   - Language preference\n"
            "   - Interaction style (concise or detailed)\n"
            "   - News topics of interest\n\n"
            "2. Ask for missing preferences in a natural, "
            "conversational way\n"
            "3. Once all preferences are collected, ALWAYS use the "
            "available tools to fetch and summarize news when the "
            "user asks for news\n\n"
            "IMPORTANT: The user's preferences are now COMPLETE. "
            "For ANY user message that is not clearly changing "
            "preferences, you MUST:\n"
            "1. Call the fetch_news tool with the primary topic "
            "from their preferences\n"
            "2. Call the summarize_news tool with the fetched "
            "articles\n\n"
            "Examples of messages that should trigger news fetching:\n"
            '- "yes" (after preferences are complete)\n'
            '- "show me news"\n'
            '- "what\'s happening today"\n'
            '- "latest updates"\n'
            '- "tell me about technology news"\n'
            "- Any general conversation should include relevant "
            "news\n\n"
            "You should fetch news for EVERY user message now that "
            "preferences are complete, unless they are explicitly "
            "changing their preferences.\n\n"
        )
        
        # Add language instruction if user has selected a non-English language
        if (self.preferences.language and 
            self.preferences.language.lower() != "english"):
            system_content += (
                f"CRITICAL LANGUAGE INSTRUCTION: You MUST respond in {self.preferences.language} ONLY. "
                f"ALL content including news summaries, greetings, and any text you generate "
                f"must be written in {self.preferences.language}. "
                f"When you receive news articles from tools, summarize them completely in {self.preferences.language}. "
                f"Never use English unless the user's language preference is English.\n\n"
            )
        
        # Add tool usage instructions
        system_content += (
            "TOOL USAGE: When you call get_latest_news and receive article data, "
            "you must create a complete news summary based on the user's preferences:\n"
            f"- Tone: {self.preferences.tone}\n"
            f"- Format: {self.preferences.format}\n" 
            f"- Language: {self.preferences.language}\n"
            f"- Detail level: {self.preferences.interaction_style}\n"
            "Create a well-formatted summary with headlines, content, and links.\n\n"
        )
        
        system_content += (
            "Current preferences collected:\n"
            f"{self.preferences.model_dump()}"
        )
        
        messages = [
            {
                "role": "system",
                "content": system_content
            }
        ]

        # Add conversation history (limit to last 10 messages)
        for msg in self.conversation_history[-10:]:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # Add current message
        messages.append({
            "role": "user",
            "content": current_message
        })

        return messages

    def _get_available_tools(self) -> List[Dict[str, Any]]:
        """Return tool definitions for OpenAI"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "get_latest_news",
                    "description": (
                        "Fetch latest news articles for the specified topic. "
                        "After calling this tool, you MUST summarize the returned articles "
                        "according to the user's preferences (language, tone, format, detail level) "
                        "that are specified in the system prompt."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "topic": {
                                "type": "string",
                                "description": (
                                    "The news topic to search for "
                                    "(e.g., technology, sports, politics)"
                                )
                            },
                            "limit": {
                                "type": "integer",
                                "description": (
                                    "Number of articles to fetch and summarize"
                                ),
                                "default": 5
                            }
                        },
                        "required": ["topic"]
                    }
                }
            }
        ]

    async def _execute_tools(self, tool_calls) -> List[ToolCall]:
        """Execute tool calls and return results."""
        results = []

        for i, tool_call in enumerate(tool_calls):
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            logger.info(
                f"Executing tool {i+1}/{len(tool_calls)}: {function_name} "
                f"with args: {arguments}"
            )
            if function_name == "get_latest_news":
                topic = arguments.get("topic", "general")
                limit = arguments.get("limit", 5)
                logger.info(
                    f"Getting latest news for topic '{topic}' "
                    f"with limit {limit}"
                )
                try:
                    # Fetch articles from EXA API
                    logger.info("Fetching articles from EXA API...")
                    articles = self.exa_fetcher.fetch(
                        topic=topic, limit=limit
                    )
                    article_count = len(articles)
                    logger.info(
                        f"Successfully fetched {article_count} articles "
                        f"from EXA API"
                    )
                    
                    # Format articles for OpenAI to summarize
                    articles_text = f"Here are {article_count} news articles about {topic}:\n\n"
                    for i, article in enumerate(articles, 1):
                        title = article.get('title', 'Untitled')
                        content = article.get('content', '')[:800]  # Limit content
                        url = article.get('url', '')
                        date = article.get('published_date', '')
                        
                        articles_text += f"**Article {i}: {title}**\n"
                        articles_text += f"Content: {content}\n"
                        if url:
                            articles_text += f"URL: {url}\n"
                        if date:
                            articles_text += f"Published: {date}\n"
                        articles_text += "\n---\n\n"
                    
                    # Log summary
                    logger.info(f"Prepared {article_count} articles for OpenAI summarization")
                    
                    results.append(ToolCall(
                        name="get_latest_news",
                        arguments=arguments,
                        result=articles_text
                    ))
                except Exception as e:
                    logger.error(f"Error in get_latest_news tool: {e}")
                    raise

        return results

    def _format_tool_response(self, tool_results: List[ToolCall]) -> str:
        """Format tool results into a response."""
        result_count = len(tool_results)
        logger.info(f"Formatting response from {result_count} tool results")
        for result in tool_results:
            if result.name == "get_latest_news" and result.result:
                logger.info("Found get_latest_news result, returning it")
                return result.result

        logger.warning("No usable tool results found")
        return (
            "I've fetched the news but couldn't generate a summary. "
            "Please try again."
        )
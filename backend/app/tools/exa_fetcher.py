import os
import requests
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ExaNewsFetcher:
    def __init__(self):
        self.api_key = os.getenv("EXA_API_KEY")
        self.base_url = "https://api.exa.ai/search"

        if not self.api_key:
            raise ValueError(
                "EXA_API_KEY environment variable is required but not found"
            )

    def fetch(self, topic: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch news articles from Exa API"""

        try:
            # Calculate date range (last 7 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            logger.info(
                f"Fetching news from {start_date.date()} to {end_date.date()}"
            )

            request_payload = {
                "query": f"Here is an interesting {topic} news article:",
                "numResults": limit,
                "useAutoprompt": True,
                "category": "news",
                "type": "neural",
                "startPublishedDate": start_date.strftime("%Y-%m-%d"),
                "endPublishedDate": end_date.strftime("%Y-%m-%d"),
                "contents": {
                    "text": True,
                    "highlights": {
                        "query": f"{topic} news",
                        "numSentences": 3
                    }
                }
            }
            logger.info(f"EXA API request payload: {request_payload}")

            response = requests.post(
                self.base_url,
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json"
                },
                json=request_payload,
                timeout=10
            )
            logger.info(f"EXA API response status: {response.status_code}")
            response.raise_for_status()

            data = response.json()
            logger.info(
                f"EXA API returned data with "
                f"{len(data.get('results', []))} results"
            )
            articles = []

            for i, result in enumerate(data.get("results", [])):
                # Extract meaningful article content from the text field
                text_content = ""

                if result.get("text"):
                    full_text = result.get("text", "")

                    # Extract main article content (skip navigation, etc.)
                    # Look for "FULL STORY" marker or main paragraphs
                    if "FULL STORY" in full_text:
                        # ScienceDaily format - extract after "FULL STORY"
                        content_start = full_text.find("FULL STORY")
                        if content_start != -1:
                            content_section = full_text[content_start + 10:]
                            # Find the main article paragraphs
                            paragraphs = []
                            lines = content_section.split('\n')
                            for line in lines:
                                line = line.strip()
                                # Skip navigation, links, short lines
                                if (len(line) > 100 and
                                        not line.startswith('[') and
                                        not line.startswith('#') and
                                        not line.startswith('**') and
                                        'http' not in line and
                                        'www.' not in line and
                                        'RELATED' not in line.upper() and
                                        'TRENDING' not in line.upper()):
                                    paragraphs.append(line)
                                    # Limit to 2-3 key paragraphs
                                    if len(paragraphs) >= 3:
                                        break
                            text_content = ' '.join(paragraphs)[:1200]
                            logger.info(
                                f"Extracted main content for article {i+1}, "
                                f"paragraphs: {len(paragraphs)}, "
                                f"length: {len(text_content)}"
                            )

                    # Fallback: if no FULL STORY, extract meaningful paragraphs
                    if not text_content:
                        lines = full_text.split('\n')
                        meaningful_lines = []
                        for line in lines:
                            line = line.strip()
                            # Keep substantial paragraphs, skip navigation
                            if (len(line) > 80 and
                                    not line.startswith('#') and
                                    not line.startswith('[') and
                                    'Skip to content' not in line and
                                    'Follow' not in line and
                                    'Menu' not in line and
                                    'www.' not in line):
                                meaningful_lines.append(line)
                                if len(' '.join(meaningful_lines)) > 1000:
                                    break
                        text_content = ' '.join(meaningful_lines)[:1200]
                        logger.info(
                            f"Extracted fallback content for article {i+1}, "
                            f"length: {len(text_content)}"
                        )
                else:
                    logger.warning(f"No text content found for article {i+1}")

                article = {
                    "title": result.get("title", ""),
                    "content": text_content,
                    "url": result.get("url", ""),
                    "published_date": result.get(
                        "publishedDate", result.get("published_date", "")
                    ),
                    "author": result.get("author", "Unknown"),
                    "score": result.get("score", 0)
                }
                articles.append(article)
                logger.info(
                    f"Processed article {i+1}: {article['title'][:50]}... "
                    f"(content length: {len(article['content'])})"
                )

            logger.info(
                f"Successfully processed {len(articles)} articles "
                f"for topic: {topic}"
            )
            return articles

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching news from Exa API: {e}")
            raise Exception(f"Failed to fetch news from Exa API: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in ExaNewsFetcher: {e}")
            raise Exception(f"Unexpected error in news fetching: {str(e)}")

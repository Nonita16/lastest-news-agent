from typing import Optional, Dict, Any
from .models import UserPreferences


class PreferenceCollector:
    """Manages the conversational preference collection flow"""
    PREFERENCE_QUESTIONS = {
        'tone': {
            'question': ("Welcome! I'm here to help you stay updated with "
                         "the latest news. To personalize your experience, "
                         "what tone would you prefer for our conversations?"),
            'options': [
                {'label': 'Formal', 'value': 'formal'},
                {'label': 'Casual', 'value': 'casual'},
                {'label': 'Enthusiastic', 'value': 'enthusiastic'}
            ],
            'type': 'single'
        },
        'format': {
            'question': ("Great choice! How would you like me to format "
                         "the news for you?"),
            'options': [
                {'label': 'Bullet Points', 'value': 'bullet points'},
                {'label': 'Paragraphs', 'value': 'paragraphs'}
            ],
            'type': 'single'
        },
        'language': {
            'question': ("What language would you prefer for our "
                         "conversations?"),
            'options': [
                {'label': 'English', 'value': 'English'},
                {'label': 'Spanish', 'value': 'Spanish'},
                {'label': 'French', 'value': 'French'},
                {'label': 'German', 'value': 'German'},
                {'label': 'Italian', 'value': 'Italian'}
            ],
            'type': 'single'
        },
        'interaction_style': {
            'question': "How detailed would you like my responses to be?",
            'options': [
                {'label': 'Concise', 'value': 'concise'},
                {'label': 'Detailed', 'value': 'detailed'}
            ],
            'type': 'single'
        },
        'topics': {
            'question': ("Finally, which news topics interest you? "
                         "You can select multiple options."),
            'options': [
                {'label': 'Technology', 'value': 'technology'},
                {'label': 'Sports', 'value': 'sports'},
                {'label': 'Politics', 'value': 'politics'},
                {'label': 'Science', 'value': 'science'},
                {'label': 'Business', 'value': 'business'},
                {'label': 'Entertainment', 'value': 'entertainment'}
            ],
            'type': 'multiple'
        }
    }

    PREFERENCE_ORDER = [
        'tone', 'format', 'language', 'interaction_style', 'topics'
    ]

    def get_next_preference_question(
            self, preferences: UserPreferences
    ) -> Optional[Dict[str, Any]]:
        """
        Get the next preference question based on what's missing
        Returns None if all preferences are complete
        """
        for pref_key in self.PREFERENCE_ORDER:
            pref_value = getattr(preferences, pref_key, None)

            # Check if this preference is missing
            if (pref_value is None or
                    (pref_key == 'topics' and
                     (not pref_value or len(pref_value) == 0))):
                question_data = self.PREFERENCE_QUESTIONS[pref_key]
                return {
                    'message': question_data['question'],
                    'quick_reply_options': question_data['options'],
                    'preference_type': pref_key,
                    'selection_type': question_data['type'],
                    'is_preference_question': True
                }

        # All preferences are complete
        return None

    def process_preference_response(
            self,
            preferences: UserPreferences,
            preference_type: str,
            value: Any
    ) -> UserPreferences:
        """
        Update preferences based on user's quick reply selection
        """
        if preference_type == 'topics':
            # Handle multiple selection for topics
            current_topics = preferences.topics or []
            if isinstance(value, list):
                preferences.topics = value
            elif value in current_topics:
                # Remove if already selected
                preferences.topics = [t for t in current_topics if t != value]
            else:
                # Add to topics
                preferences.topics = current_topics + [value]
        else:
            # Single selection for other preferences
            setattr(preferences, preference_type, value)

        return preferences

    def get_completion_message(self) -> str:
        """
        Get the message to send when preference collection is complete
        """
        return ("Perfect! I've saved all your preferences. Now, what "
                "would you like to know about today's news?")

    def get_welcome_back_message(self, preferences: UserPreferences) -> str:
        """
        Get the message for users who already have preferences set
        """
        if preferences.is_complete():
            return ("Welcome back! What news would you like to know "
                    "about today?")
        else:
            # Partial preferences - will continue collection
            return ("Welcome back! Let's continue setting up your "
                    "preferences.")

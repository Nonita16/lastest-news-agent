# Latest News Agent 📰

An AI-powered chat assistant that learns your preferences and delivers personalized news summaries. Built with Next.js 15, FastAPI, and OpenAI GPT-4.

## 🌟 Overview

Latest News Agent is an intelligent news aggregation and summarization system that creates a personalized news experience. The application uses advanced AI to understand user preferences and deliver tailored news content in the user's preferred format, language, and style.


<img width="1149" height="941" alt="Screenshot 2025-08-19 at 7 50 13 PM" src="https://github.com/user-attachments/assets/2ae78bd6-df20-44ea-a88a-cef9b800315b" />




### Key Features

- **🎯 Personalized Preferences**: Collects and remembers user preferences for tone, format, language, interaction style, and topics
- **🤖 AI-Powered Conversations**: Uses OpenAI GPT-4 Turbo for natural language processing and intelligent responses
- **📰 Real-time News Fetching**: Integrates with Exa API to fetch the latest news articles from the past 7 days
- **🌐 Multi-language Support**: Delivers news summaries in multiple languages including English, Spanish, French, German, Italian, Portuguese, Chinese, and Japanese
- **💾 Persistent Sessions**: Automatically saves conversation history and preferences using browser local storage
- **🔄 Streaming Responses**: Real-time streaming of AI responses for better user experience
- **📱 Responsive Design**: Fully responsive UI with mobile-optimized drawer navigation
- **🎨 Modern UI**: Built with Tailwind CSS and Headless UI components for a clean, professional interface
- **⚡ Fast Performance**: Next.js 15 with Turbopack for optimized build and runtime performance
- **🔌 Offline Resilience**: Network status monitoring with offline fallback support

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js 15    │────▶│   FastAPI       │────▶│   External      │
│   Frontend      │     │   Backend       │     │   APIs          │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                        │                       │
       │                        │                       │
    WebSocket              REST API              ┌──────────┐
    Streaming              Endpoints             │ OpenAI   │
                                                 │ GPT-4    │
                                                 └──────────┘
                                                       │
                                                 ┌──────────┐
                                                 │ Exa API  │
                                                 │ (News)   │
                                                 └──────────┘
```

### Backend Components (FastAPI)

- **`app/main.py`**: FastAPI application entry point with CORS configuration
- **`app/agent.py`**: Core NewsAgent class handling AI interactions and tool execution
- **`app/models.py`**: Pydantic models for data validation and serialization
- **`app/preference_collector.py`**: Manages user preference collection flow
- **`app/config.py`**: Application settings and environment configuration
- **`app/routers/chat.py`**: Chat endpoint handlers with streaming support
- **`app/tools/exa_fetcher.py`**: Exa API integration for news fetching
- **`app/tools/summarizer.py`**: News article summarization utilities

### Frontend Components (Next.js 15)

- **`app/page.tsx`**: Main chat page with sidebar navigation
- **`app/components/ChatInterface.tsx`**: Core chat interface component
- **`app/components/MessageList.tsx`**: Message display with markdown support
- **`app/components/PreferencesChecklist.tsx`**: Visual preference status display
- **`app/components/StreamingMessageDisplay.tsx`**: Real-time message streaming
- **`app/components/QuickReplyPills.tsx`**: Quick reply options for preferences
- **`app/components/NetworkStatus.tsx`**: Network connectivity monitoring
- **`lib/hooks/`**: Custom React hooks for state management and API interactions
- **`types/index.ts`**: TypeScript type definitions

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v20.0.0 or higher
- **Python**: 3.9 or higher
- **npm**: 10.0.0 or higher (comes with Node.js)
- **pip**: Latest version

### Required API Keys

You'll need to obtain the following API keys:

1. **OpenAI API Key**: Sign up at [OpenAI Platform](https://platform.openai.com/)
2. **Exa API Key**: Sign up at [Exa.ai](https://exa.ai/)

## 🚀 Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/latest-news-agent.git
cd latest-news-agent
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a Python virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- On macOS/Linux:
  ```bash
  source venv/bin/activate
  ```
- On Windows:
  ```bash
  .\venv\Scripts\activate
  ```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file in the backend directory:
```bash
touch .env
```

6. Add your API keys to the `.env` file:
```env
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
EXA_API_KEY=your_exa_api_key_here

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the frontend directory:
```bash
touch .env.local
```

4. Add the backend API URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key for GPT-4 access | Yes | - |
| `EXA_API_KEY` | Your Exa API key for news fetching | Yes | - |
| `ENVIRONMENT` | Application environment | No | development |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | No | INFO |

#### Frontend (.env.local)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | No | http://localhost:8000 |

### CORS Configuration

The backend is configured to accept requests from:
- `http://localhost:3000` (default Next.js dev server)
- `http://localhost:3001` (alternative port)

To add more origins, modify `backend/app/config.py`:

```python
cors_origins: list[str] = ["http://localhost:3000", "http://your-domain.com"]
```

## 🎮 Usage

### Starting the Application

#### 1. Start the Backend Server

In the backend directory with the virtual environment activated:

```bash
fastapi dev
```

The backend will be available at:
- API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- Alternative API docs: `http://localhost:8000/redoc`

#### 2. Start the Frontend Development Server

In the frontend directory:

```bash
npm run dev
```

The frontend will be available at:
- Application: `http://localhost:3000`

### Using the Application

1. **Initial Setup**: When you first open the application, the AI assistant will guide you through setting up your preferences:
   - Choose your preferred tone (formal, casual, or enthusiastic)
   - Select response format (bullet points or paragraphs)
   - Pick your language preference
   - Choose interaction style (concise or detailed)
   - Select news topics of interest

2. **Getting News**: Once preferences are set, you can:
   - Ask for news about specific topics
   - Request general news updates
   - Ask follow-up questions about articles
   - Change your preferences at any time

3. **Features**:
   - **Quick Replies**: Use the pill buttons for fast preference selection
   - **Streaming Responses**: Watch as the AI generates responses in real-time
   - **Persistent Sessions**: Your conversation and preferences are automatically saved
   - **Mobile Sidebar**: On mobile devices, tap the hamburger menu to view preferences
   - **Network Status**: Monitor your connection status in the header

### Example Interactions

```
User: "Show me the latest technology news"
Assistant: [Fetches and summarizes recent tech articles based on your preferences]

User: "Tell me more about AI developments"
Assistant: [Provides detailed information about AI news in your preferred format]

User: "Change my language to Spanish"
Assistant: [Updates preference and responds in Spanish]
```

## 📡 API Documentation

### Base URL

```
http://localhost:8000/api
```

### Endpoints

#### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy"
}
```

#### Chat Endpoint

```http
POST /api/chat/message
```

Request Body:
```json
{
  "message": "string",
  "conversation_id": "string",
  "preferences": {
    "tone": "formal | casual | enthusiastic",
    "format": "bullet points | paragraphs",
    "language": "string",
    "interaction_style": "concise | detailed",
    "topics": ["string"]
  },
  "session_id": "string (optional)"
}
```

Response:
```json
{
  "message": {
    "role": "assistant",
    "content": "string",
    "timestamp": "datetime",
    "tool_calls": [],
    "quick_reply_options": [],
    "is_preference_question": false,
    "preference_type": "string",
    "selection_type": "single | multiple"
  },
  "preferences": {},
  "conversation_id": "string",
  "requires_tool": false
}
```

#### Streaming Chat Endpoint

```http
POST /api/chat/stream
```

Same request body as `/message`, but returns a Server-Sent Events stream.

## 🛠️ Development

### Project Structure

```
latest-news-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app
│   │   ├── agent.py          # AI agent logic
│   │   ├── models.py         # Data models
│   │   ├── config.py         # Configuration
│   │   ├── preference_collector.py
│   │   ├── routers/
│   │   │   └── chat.py       # Chat endpoints
│   │   └── tools/
│   │       ├── exa_fetcher.py    # News fetching
│   │       └── summarizer.py     # Summarization
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── app/
│   │   ├── components/       # React components
│   │   ├── page.tsx          # Main page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── lib/
│   │   └── hooks/           # Custom React hooks
│   ├── types/               # TypeScript types
│   ├── public/              # Static assets
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
└── README.md
```

### Code Formatting

#### Backend (Python)

```bash
cd backend
black app/  # Format code
flake8 app/  # Lint code
mypy app/  # Type checking
```

#### Frontend (TypeScript)

```bash
cd frontend
npm run lint  # Lint code
npm run format  # Format code (if configured)
```

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAI API Key Not Working

**Error**: `OPENAI_API_KEY environment variable is required but not found`

**Solution**: 
- Ensure your `.env` file is in the `backend` directory
- Verify the API key is correct and has valid credits
- Restart the backend server after adding the key

#### 2. CORS Errors

**Error**: `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy`

**Solution**:
- Ensure the backend server is running
- Check that the frontend URL is in the CORS allowed origins in `backend/app/config.py`
- Clear browser cache and cookies

#### 3. Exa API Not Returning Results

**Error**: `Failed to fetch news from Exa API`

**Solution**:
- Verify your Exa API key is valid
- Check your API rate limits
- Ensure you have an active internet connection
- Try a different news topic

#### 4. Frontend Build Errors

**Error**: `Module not found` or TypeScript errors

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 5. Python Virtual Environment Issues

**Error**: `No module named 'fastapi'`

**Solution**:
- Ensure the virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`


## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Exa.ai for news aggregation API
- Next.js team for the amazing framework
- FastAPI for the high-performance backend framework
- Tailwind CSS and Headless UI for beautiful components

# 🎤 Vocastant - AI Voice Assistant with Document Analysis

A sophisticated real-time voice AI assistant built with LiveKit, Google Gemini, Deepgram, and Cartesia. Vocastant can read, analyze, and answer questions about uploaded documents while maintaining natural voice conversations.

## ✨ Features

- **Real-time voice conversations** with Google Gemini LLM
- **Advanced document analysis** using RAG (Retrieval Augmented Generation)
- **High-quality speech recognition** using Deepgram STT
- **Natural text-to-speech** with Cartesia TTS
- **Voice activity detection** with Silero VAD
- **Modern React frontend** with dark mode and sleek UI
- **Document upload & management** (PDF, DOCX, TXT)
- **Live STT/TTS chat interface** for real-time interaction
- **Cloud deployment** on LiveKit infrastructure

## 🏗️ Architecture

- **Backend**: Python agent using LiveKit Agents framework with custom document tools
- **Frontend**: React/TypeScript with modern UI components and LiveKit integration
- **AI Services**: Google Gemini LLM, Deepgram STT, Cartesia TTS, Silero VAD
- **Document Processing**: Node.js backend with text extraction from multiple formats
- **Deployment**: LiveKit Cloud (containerized) with ngrok backend exposure

## 🚀 Quick Start

### Prerequisites

You'll need API keys for:
- **LiveKit** (API Key, Secret, URL)
- **Google Gemini** (API Key)
- **Deepgram** (API Key) 
- **Cartesia** (API Key)

### 1. Backend Setup

```bash
# Install Node.js dependencies
cd backend
npm install

# Start the backend server
npm start
# Backend runs on port 3001
```

### 2. Agent Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp env.example .env
# Add your API keys to .env

# Deploy to LiveKit Cloud
lk agent deploy
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

## 📁 Project Structure

```
vocastant/
├── agent.py                    # Main voice AI agent with document tools
├── tools/
│   └── document_tools.py      # RAG implementation for document access
├── requirements.txt            # Python dependencies
├── .env                       # Environment variables
├── Dockerfile                 # Container configuration
├── livekit.toml              # LiveKit deployment config
├── backend/                   # Node.js document processing server
│   ├── server.js             # Express server with document APIs
│   └── package.json
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # Modern UI components
│   │   ├── contexts/         # Theme and state management
│   │   ├── services/         # API integration
│   │   └── store/            # Zustand state management
│   ├── package.json
│   └── ...
└── README.md                 # This file
```

## 🔧 Configuration

### Environment Variables

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI Service Keys
GOOGLE_API_KEY=your_gemini_key
DEEPGRAM_API_KEY=your_deepgram_key
CARTESIA_API_KEY=your_cartesia_key

# Backend Configuration
BACKEND_URL=https://your-ngrok-url.ngrok-free.app
```

## 🎯 Usage

### Document Analysis
1. **Upload documents** through the modern UI (PDF, DOCX, TXT)
2. **Ask questions** about your documents using voice
3. **Get real-time answers** based on actual document content
4. **Live chat interface** for text-based interaction

### Voice Interaction
1. **Start voice chat** in the frontend
2. **Ask about documents** - Vocastant will access and analyze them
3. **Natural conversations** with context-aware responses
4. **Real-time STT/TTS** for seamless voice experience

### LiveKit Playground
1. Go to https://agents-playground.livekit.io/
2. Your deployed agent will automatically connect
3. Start talking with Vocastant about your documents!

## 🛠️ Development

### Local Testing
```bash
# Test agent locally (console mode)
python agent.py console

# Test backend APIs
curl http://localhost:3001/api/documents

# Deploy to cloud
lk agent deploy
```

### Frontend Development
```bash
cd frontend
npm run dev
npm run build
```

## 🔍 Document Analysis Capabilities

Vocastant can:
- **List all uploaded documents** with metadata
- **Analyze specific documents** by ID or name
- **Generate comprehensive summaries** of document content
- **Search across multiple documents** for relevant information
- **Answer questions** based on actual document text
- **Handle multiple file formats** (PDF, DOCX, TXT)

## 📚 Documentation

- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Google Gemini API](https://ai.google.dev/docs)
- [Deepgram API](https://developers.deepgram.com/)
- [Cartesia API](https://docs.cartesia.ai/)
- [LiveKit Components React](https://docs.livekit.io/reference/components/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both local console and cloud deployment
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

 
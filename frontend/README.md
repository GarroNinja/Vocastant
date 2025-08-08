# Vocastant Frontend

A modern, document-based voice AI interface built with React, TypeScript, and Tailwind CSS.

## Features

- 📄 **Document Upload**: Drag & drop support for PDF, DOCX, TXT, and Markdown files
- 🎤 **Voice Interaction**: Connect to LiveKit for voice conversations with AI
- 💬 **Chat Interface**: Text and voice chat with AI assistant
- 🔍 **Document Search**: Search through uploaded documents
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create a `.env` file in the frontend directory for custom configuration:
```env
# LiveKit Configuration - defaults are already set for your deployment
VITE_LIVEKIT_URL=wss://vocastant-8kvolde0.livekit.cloud
VITE_LIVEKIT_ROOM=vocastant-room
# Note: Token is included for testing - generate new ones as needed

# Optional: App Configuration
VITE_APP_NAME=Vocastant
VITE_APP_VERSION=1.0.0
```

**Important**: The frontend is already configured to connect to your deployed agent at `wss://vocastant-8kvolde0.livekit.cloud`. A test token is included that's valid for 1 hour. For production, you'll want to generate tokens dynamically.

3. Start the development server:
```bash
npm run dev
```

## LiveKit Integration

This frontend is designed to work with your deployed LiveKit agent. To connect:

1. Deploy your LiveKit agent (see the main project README)
2. Get your LiveKit Cloud credentials
3. Update the environment variables
4. Connect through the Voice Connection panel

## Component Structure

- `DocumentUpload`: Handles file uploads with drag & drop
- `DocumentViewer`: Displays uploaded documents and allows selection
- `ChatPanel`: Chat interface for text and voice conversations
- `VoiceConnection`: Manages LiveKit connection and voice controls
- `App`: Main application layout and routing

## Technologies Used

- React 18 with TypeScript
- Tailwind CSS with shadcn/ui components
- Zustand for state management
- LiveKit for voice communication
- Vite for build tooling

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

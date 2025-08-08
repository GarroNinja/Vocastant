#!/usr/bin/env python3
"""
Vocastant - Voice AI Agent for LiveKit Cloud
Refactored version with organized modules and improved RAG implementation
"""
import logging
import os
from dotenv import load_dotenv

# LiveKit imports
from livekit.agents import (
    NOT_GIVEN,
    Agent,
    AgentFalseInterruptionEvent,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RoomInputOptions,
    RunContext,
    WorkerOptions,
    cli,
    metrics,
)
from livekit.plugins import cartesia, deepgram, google, silero

# Import our custom document tools
from tools.document_tools import (
    list_uploaded_documents,
    analyze_specific_document,
    get_document_summary,
    search_documents_for_question,
    test_document_access,
    inject_document_to_context,
    get_document_help
)
from tools.text_utils import clean_text_for_tts

logger = logging.getLogger("agent")
load_dotenv()

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'https://alive-jackal-in.ngrok-free.app')
logger.info(f"BACKEND_URL: {BACKEND_URL}")

def prewarm(proc: JobProcess):
    """Preload VAD model for better performance"""
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    """Main agent entrypoint with improved error handling and logging"""
    # Logging setup
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Log environment setup
    logger.info(f"DEEPGRAM_API_KEY present: {'DEEPGRAM_API_KEY' in os.environ}")
    logger.info(f"GOOGLE_API_KEY present: {'GOOGLE_API_KEY' in os.environ}")
    logger.info(f"CARTESIA_API_KEY present: {'CARTESIA_API_KEY' in os.environ}")
    
    try:
        # Create AgentSession with proper configuration
        session = AgentSession(
            # LLM: Google Gemini for natural language processing
            llm=google.LLM(model="gemini-1.5-flash"),
            
            # STT: Deepgram for speech recognition
            stt=deepgram.STT(
                model="nova-2-general",
                language="en-US",
                smart_format=True,
                punctuate=True,
            ),
            
            # TTS: Cartesia for natural voice synthesis
            tts=cartesia.TTS(
                model="sonic-2",
                voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
            ),
            
            # VAD: Silero for voice activity detection
            vad=ctx.proc.userdata["vad"],
        )

        # Handle false positive interruptions
        @session.on("agent_false_interruption")
        def _on_agent_false_interruption(ev: AgentFalseInterruptionEvent):
            logger.info("False positive interruption detected, resuming")
            session.generate_reply(instructions=ev.extra_instructions or NOT_GIVEN)

        # Metrics collection for performance monitoring
        usage_collector = metrics.UsageCollector()

        @session.on("metrics_collected")
        def _on_metrics_collected(ev: MetricsCollectedEvent):
            metrics.log_metrics(ev.metrics)
            usage_collector.collect(ev.metrics)

        async def log_usage():
            summary = usage_collector.get_summary()
            logger.info(f"Usage summary: {summary}")

        ctx.add_shutdown_callback(log_usage)

        # Create agent with improved instructions and all document tools
        agent = Agent(
            instructions="""You are Vocastant, a friendly AI voice assistant with powerful document analysis capabilities.

CORE ROLE:
You help users with conversation, basic questions, and comprehensive document analysis. You can read, analyze, and answer questions about uploaded documents.

CONVERSATION STYLE:
- Keep responses conversational and concise (1-3 sentences for simple questions)
- Be friendly and helpful
- Use natural language without excessive technical jargon

DOCUMENT ANALYSIS CAPABILITIES:
- list_uploaded_documents: See what documents are available with their IDs
- analyze_specific_document: Get full access to document content and answer specific questions
- get_document_summary: Create comprehensive document summaries
- search_documents_for_question: Find relevant content across multiple documents
- inject_document_to_context: Directly inject document content into your context
- test_document_access: Diagnostic tool to check system connectivity
- get_document_help: Provide help and usage instructions

IMPORTANT DOCUMENT ANALYSIS GUIDELINES:
- ALWAYS start by calling list_uploaded_documents when users ask about documents
- Show document IDs clearly so users can reference them
- Use analyze_specific_document or get_document_summary to access actual content
- Base answers on real document text, not assumptions
- If a tool fails, try another approach or use test_document_access to diagnose
- Provide clear guidance on how to use the tools effectively

EXAMPLE WORKFLOW:
1. User asks about documents → Call list_uploaded_documents
2. User wants to analyze a document → Use analyze_specific_document with the ID
3. User has questions → Answer based on the actual document content
4. If issues arise → Use test_document_access to diagnose problems

Be helpful, engaging, and always prioritize giving users access to their document content!""",

            tools=[
                list_uploaded_documents,
                analyze_specific_document,
                get_document_summary,
                search_documents_for_question,
                test_document_access,
                inject_document_to_context,
                get_document_help
            ]
        )
        
        logger.info("Agent initialized successfully with document analysis tools")
        logger.info(f"Available tools: {[tool.__name__ for tool in [list_uploaded_documents, analyze_specific_document, get_document_summary, search_documents_for_question, test_document_access, inject_document_to_context, get_document_help]]}")
        logger.info(f"Backend URL: {BACKEND_URL}")
        
        # Start the session
        await session.start(
            agent=agent,
            room=ctx.room,
            room_input_options=RoomInputOptions(),
        )

        # Join the room and connect
        await ctx.connect()
        logger.info(f"Connected to room: {ctx.room.name}")

        # Generate initial greeting
        await session.generate_reply(
            instructions="""Give a brief, friendly greeting introducing yourself as Vocastant, the document analysis assistant. 
            Mention that you can read and analyze uploaded documents and answer questions about them. 
            Keep it under 2 sentences and conversational for voice interaction."""
        )
        
    except Exception as e:
        logger.error(f"Error in agent entrypoint: {e}")
        raise

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
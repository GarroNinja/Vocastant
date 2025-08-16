"""
Simplified document tools for Vocastant agent
"""
import logging
import os
import aiohttp
from livekit.agents import RunContext, get_job_context
from livekit.agents.llm import function_tool

logger = logging.getLogger("document_tools")

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'https://d1ye5bx9w8mu3e.cloudfront.net')

class DocumentAccessError(Exception):
    """Custom exception for document access errors"""
    pass

def get_room_name_from_context(context: RunContext) -> str:
    """Extract room name from RunContext"""
    try:
        # Debug context attributes
        logger.info(f"🔍 Context type: {type(context)}")
        logger.info(f"🔍 Context attributes: {[attr for attr in dir(context) if not attr.startswith('__')]}")
        
        # Try to get room name from context
        if hasattr(context, 'room') and hasattr(context.room, 'name'):
            room_name = context.room.name
            logger.info(f"✅ Got room name from context.room.name: '{room_name}'")
            return room_name
        
        # Try alternative paths
        if hasattr(context, '_room') and hasattr(context._room, 'name'):
            room_name = context._room.name
            logger.info(f"✅ Got room name from context._room.name: '{room_name}'")
            return room_name
            
        # Try to get from job context if available
        if hasattr(context, 'job_context') and hasattr(context.job_context, 'room') and hasattr(context.job_context.room, 'name'):
            room_name = context.job_context.room.name
            logger.info(f"✅ Got room name from job_context: '{room_name}'")
            return room_name
        
        # Final fallback: try global job context
        try:
            job_ctx = get_job_context()
            if hasattr(job_ctx, 'room') and hasattr(job_ctx.room, 'name'):
                room_name = job_ctx.room.name
                logger.info(f"✅ Got room name from get_job_context(): '{room_name}'")
                return room_name
        except Exception as _:
            pass
        logger.error("❌ Could not find room name in any context path or job context")
        return "unknown-room"
    except Exception as e:
        logger.error(f"❌ Error getting room name: {e}")
        return "unknown-room"

async def get_room_documents(room_name: str):
    """Get list of documents for a specific room"""
    try:
        logger.info(f"📚 Fetching documents for room: {room_name}")
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            url = f"{BACKEND_URL}/api/documents/room/{room_name}"
            logger.info(f"🔗 Request URL: {url}")
            
            async with session.get(url) as response:
                logger.info(f"📡 Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        documents = data.get('documents', [])
                        logger.info(f"✅ Found {len(documents)} documents")
                        return documents
                    else:
                        logger.error(f"❌ Response not successful: {data}")
                        raise DocumentAccessError(f"Backend error: {data}")
                else:
                    logger.error(f"❌ HTTP error: {response.status}")
                    raise DocumentAccessError(f"HTTP error: {response.status}")
                    
    except Exception as e:
        logger.error(f"❌ Error fetching documents: {e}")
        raise DocumentAccessError(f"Failed to fetch documents: {str(e)}")

def _looks_like_uuid(value: str) -> bool:
    try:
        import re
        return bool(re.match(r"^[0-9a-fA-F-]{8,}$", value))
    except Exception:
        return False

async def resolve_document_id(room_name: str, identifier: str):
    """Resolve a document identifier which may be an ID, a name, or 'latest'."""
    try:
        if identifier.strip().lower() in {"latest", "most recent", "newest"}:
            docs = await get_room_documents(room_name)
            if not docs:
                raise DocumentAccessError("No documents uploaded in this room")
            # sort by uploadedAt desc
            docs_sorted = sorted(docs, key=lambda d: d.get('uploadedAt') or d.get('uploaded_at') or 0, reverse=True)
            return docs_sorted[0]['id']

        if _looks_like_uuid(identifier):
            return identifier

        # try match by name (case-insensitive, strip extension)
        docs = await get_room_documents(room_name)
        def normalize(name: str) -> str:
            name = (name or '').strip()
            if '.' in name:
                name = name.rsplit('.', 1)[0]
            return name.lower()
        norm_target = normalize(identifier)
        for d in docs:
            if normalize(d.get('originalName', '')) == norm_target:
                return d['id']
        # partial contains
        for d in docs:
            if norm_target in normalize(d.get('originalName', '')):
                return d['id']

        raise DocumentAccessError(f"Could not find a document matching '{identifier}' in this room")
    except Exception as e:
        raise DocumentAccessError(str(e))

async def get_document_content_agent(document_id: str, room_name: str):
    """Get document content using room-scoped content endpoint (AWS compatible),
    mirroring the local implementation style by returning a standardized object."""
    try:
        logger.info(f"📄 Fetching content for document: {document_id} in room: {room_name}")
        timeout = aiohttp.ClientTimeout(total=10)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # Use the room-scoped /content endpoint just like the local impl,
            # but include roomName for AWS room isolation
            url = f"{BACKEND_URL}/api/documents/{document_id}/content?roomName={room_name}"
            logger.info(f"🔗 Request URL: {url}")
            
            async with session.get(url) as response:
                logger.info(f"📡 Response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        document = data['document']
                        content = document.get('content') or document.get('extractedText')
                        
                        if not content:
                            raise DocumentAccessError("Document has no content")
                        
                        logger.info(f"✅ Retrieved document content ({len(content)} chars)")
                        return {
                            'id': document.get('id'),
                            'originalName': document.get('originalName'),
                            'content': content
                        }
                    else:
                        logger.error(f"❌ Response not successful: {data}")
                        raise DocumentAccessError(f"Backend error: {data}")
                else:
                    logger.error(f"❌ HTTP error: {response.status}")
                    raise DocumentAccessError(f"HTTP error: {response.status}")
                    
    except Exception as e:
        logger.error(f"❌ Error fetching document content: {e}")
        raise DocumentAccessError(f"Failed to fetch content: {str(e)}")

@function_tool
async def list_uploaded_documents(context: RunContext):
    """List all uploaded documents available for analysis"""
    try:
        room_name = get_room_name_from_context(context)
        logger.info(f"📋 Listing documents for room: '{room_name}'")
        
        if room_name == "unknown-room":
            return (
                "I'm having trouble determining the current room, so I can't list documents yet. "
                "Please try speaking again or rejoin the session from the website so I can detect the room."
            )
        
        # Try to get documents for this room
        try:
            docs = await get_room_documents(room_name)
        except DocumentAccessError as e:
            # If room-specific endpoint fails, try to provide more helpful error
            return f"""I found your room name ('{room_name}') but couldn't access documents from it.

🔧 Possible issues:
1. No documents have been uploaded to this specific room yet
2. The room-document association isn't working properly
3. Backend connection issue

Error details: {str(e)}

Try uploading a document first, then ask me to list documents again."""
        
        if not docs:
            return f"""No documents found in room '{room_name}'. 

This could mean:
1. 📤 No documents have been uploaded to this room yet
2. 🕐 Documents were uploaded but not properly associated with this room

Please upload a document first, then ask me to list documents again."""
        
        # Create document list without reading out raw IDs (IDs are kept internal)
        doc_list = []
        for doc in docs:
            name = doc['originalName']
            if name.endswith(('.pdf', '.docx', '.txt')):
                name = name.rsplit('.', 1)[0]
            doc_list.append(f"• {name}")

        result = f"✅ I see {len(docs)} document(s) in this room: \n"
        result += "\n".join(doc_list)
        result += "\n\nTell me which one to open by name, and I won't read any IDs aloud."
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return f"""I encountered an unexpected error while listing documents.

🔧 Error details: {str(e)}

This might be a system issue. Please try again, or let me know if the problem persists."""

@function_tool
async def analyze_specific_document(context: RunContext, document_id: str, question: str = None):
    """Analyze a specific document by ID and optionally answer a question about it"""
    try:
        logger.info(f"🔍 Analyzing document: {document_id}")
        
        # Resolve and get document content (room-scoped)
        room_name = get_room_name_from_context(context)
        resolved_id = await resolve_document_id(room_name, document_id)
        doc_info = await get_document_content_agent(resolved_id, room_name)
        content = doc_info['content']
        
        # Truncate content if too long
        if len(content) > 3000:
            content = content[:3000] + "...[content truncated]"
        
        if question:
            return f"""DOCUMENT ANALYSIS:

Document: {doc_info.get('originalName', 'Unknown')}
Question: {question}

Content:
{content}

Based on this document content, I can now answer your question."""
        else:
            return f"""DOCUMENT CONTENT:

Document: {doc_info.get('originalName', 'Unknown')}

Content:
{content}

I now have access to this document. What would you like to know about it?"""
            
    except DocumentAccessError as e:
        return f"I'm having trouble accessing that document. Error: {str(e)}"
    except Exception as e:
        logger.error(f"❌ Unexpected error analyzing document: {e}")
        return f"I encountered an error analyzing the document: {str(e)}"

@function_tool
async def analyze_latest_document(context: RunContext, question: str = None):
    """Analyze the most recently uploaded document in the current room."""
    room_name = get_room_name_from_context(context)
    try:
        latest_id = await resolve_document_id(room_name, 'latest')
        return await analyze_specific_document(context, latest_id, question)
    except Exception as e:
        return f"I'm having trouble accessing the latest document: {str(e)}"

@function_tool
async def get_document_summary(context: RunContext, document_id: str):
    """Get a comprehensive summary of a document"""
    try:
        logger.info(f"📝 Summarizing document: {document_id}")
        
        room_name = get_room_name_from_context(context)
        doc_info = await get_document_content_agent(document_id, room_name)
        content = doc_info['content']
        
        # Truncate for summary
        if len(content) > 2500:
            content = content[:2500] + "...[content truncated for summary]"
        
        return f"""DOCUMENT FOR SUMMARY:

Document: {doc_info.get('originalName', 'Unknown')}

Content:
{content}

Please provide a comprehensive summary of this document, highlighting the key points and main themes."""
        
    except DocumentAccessError as e:
        return f"I'm having trouble accessing that document for summary. Error: {str(e)}"
    except Exception as e:
        logger.error(f"❌ Unexpected error getting summary: {e}")
        return f"I encountered an error while trying to summarize the document: {str(e)}"

@function_tool
async def get_document_help(context: RunContext):
    """Get help and instructions for using document analysis tools"""
    return """📚 DOCUMENT ANALYSIS HELP\n\nI can help you analyze uploaded documents in the current room. Here's how to use my tools:\n\n🔍 AVAILABLE COMMANDS:\n• "List documents" - See documents in this room (by name)\n• "Analyze document [name or ID]" - Read the document and answer questions\n• "Summarize document [name or ID]" - Get a comprehensive summary\n\n💡 NOTES:\n• I won't read raw IDs aloud; I prefer names.\n• All access is scoped to this room only.\n• If you say a document name, I'll match it to the correct file.\n\nTry: "List documents" to see what's available now."""
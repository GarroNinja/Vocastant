"""
Document access and analysis tools for Vocastant agent
"""
import logging
import os
import aiohttp
from livekit.agents import RunContext
from livekit.agents.llm import function_tool

logger = logging.getLogger("document_tools")

# Backend API configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'https://alive-jackal-in.ngrok-free.app')

class DocumentAccessError(Exception):
    """Custom exception for document access errors"""
    pass

async def get_backend_documents():
    """Get list of all documents from backend"""
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            async with session.get(f"{BACKEND_URL}/api/documents") as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        return data.get('documents', [])
                raise DocumentAccessError(f"Failed to fetch documents: {response.status}")
    except Exception as e:
        logger.error(f"Error fetching documents: {e}")
        raise DocumentAccessError(f"Backend connection error: {str(e)}")

async def get_document_content(document_id: str):
    """Get full content of a specific document"""
    try:
        logger.info(f"get_document_content called with document_id: {document_id}")
        logger.info(f"Making request to: {BACKEND_URL}/api/documents/{document_id}/content")
        
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            async with session.get(f"{BACKEND_URL}/api/documents/{document_id}/content") as response:
                logger.info(f"Response status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Response data keys: {list(data.keys())}")
                    if data.get('success'):
                        document = data['document']
                        # Handle both 'content' and 'extractedText' fields for compatibility
                        content = document.get('content') or document.get('extractedText')
                        if not content:
                            raise DocumentAccessError("Document has no content field")
                        
                        logger.info(f"Successfully retrieved document: {document.get('originalName')} with {len(content)} characters")
                        
                        # Create a standardized document object
                        return {
                            'id': document.get('id'),
                            'originalName': document.get('originalName'),
                            'content': content,
                            'extractedText': content,  # Keep both for compatibility
                            'wordCount': document.get('metadata', {}).get('wordCount'),
                            'characterCount': document.get('metadata', {}).get('characterCount'),
                            'uploadedAt': document.get('metadata', {}).get('uploadedAt'),
                            'type': document.get('metadata', {}).get('type')
                        }
                    else:
                        logger.error(f"Response not successful: {data}")
                        raise DocumentAccessError(f"Response not successful: {data}")
                else:
                    logger.error(f"HTTP error: {response.status}")
                    raise DocumentAccessError(f"Document not found: {response.status}")
    except Exception as e:
        logger.error(f"Error getting document {document_id}: {e}")
        raise DocumentAccessError(f"Failed to access document: {str(e)}")

async def analyze_document_with_question(document_id: str, question: str):
    """Analyze document with a specific question"""
    try:
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=10, limit_per_host=5)
        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            url = f"{BACKEND_URL}/api/documents/{document_id}/analyze?question={question}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('success'):
                        analysis = data['analysis']
                        # Ensure we have the extractedText field
                        if 'extractedText' not in analysis:
                            # If analyze endpoint doesn't return content, get it separately
                            doc_content = await get_document_content(document_id)
                            analysis['extractedText'] = doc_content['content']
                        return analysis
                raise DocumentAccessError(f"Analysis failed: {response.status}")
    except Exception as e:
        logger.error(f"Error analyzing document {document_id} with question '{question}': {e}")
        raise DocumentAccessError(f"Analysis failed: {str(e)}")

def format_document_content_for_llm(doc_info: dict, content: str, question: str = None, max_length: int = 2500):
    """
    Format document content for LLM processing with proper truncation and context
    """
    readable_name = doc_info.get('originalName', 'Unknown Document')
    if readable_name.startswith('document-'):
        readable_name = "Uploaded Document"
    elif readable_name.endswith('.pdf'):
        readable_name = readable_name[:-4]
    elif readable_name.endswith('.docx'):
        readable_name = readable_name[:-5]
    elif readable_name.endswith('.txt'):
        readable_name = readable_name[:-4]
    
    # Truncate content if too long, but preserve structure
    if len(content) > max_length:
        content_preview = content[:max_length] + "\n\n[Content truncated for processing...]"
        logger.info(f"Document content truncated from {len(content)} to {max_length} characters")
    else:
        content_preview = content
    
    if question:
        return f"""I have successfully accessed the document "{readable_name}".

Question: {question}

Document Content:
{content_preview}

Based on this document, I can now provide a specific answer to your question."""
    else:
        return f"""I have successfully accessed the document "{readable_name}".

Document Content:
{content_preview}

I can now answer any questions you have about this document."""

def create_document_summary(doc_info: dict, content: str, max_length: int = 2500):
    """Create a structured summary prompt for the LLM"""
    readable_name = doc_info.get('originalName', 'Unknown Document')
    if readable_name.endswith(('.pdf', '.docx', '.txt')):
        readable_name = readable_name.rsplit('.', 1)[0]
    
    # Truncate content for summary
    if len(content) > max_length:
        content_preview = content[:max_length] + "\n\n[Content truncated...]"
    else:
        content_preview = content
    
    return f"""Please provide a comprehensive summary of the document "{readable_name}".

Document Content:
{content_preview}

Please summarize the key points, main themes, and important information from this document."""

@function_tool
async def list_uploaded_documents(context: RunContext):
    """List all uploaded documents available for analysis"""
    try:
        docs = await get_backend_documents()
        
        if not docs:
            return "No documents are currently uploaded. Please upload a document first to analyze."
        
        # Create a detailed summary with document IDs
        doc_summaries = []
        for doc in docs:
            readable_name = doc['originalName']
            if readable_name.endswith(('.pdf', '.docx', '.txt')):
                readable_name = readable_name.rsplit('.', 1)[0]
            
            doc_summaries.append(f"• {readable_name} (ID: {doc['id']}, {doc['wordCount']} words)")
        
        result = f"I found {len(docs)} document(s):\n" + "\n".join(doc_summaries)
        result += "\n\nTo analyze a specific document, you can:"
        result += "\n1. Ask me to 'analyze document [ID]' with a specific question"
        result += "\n2. Ask me to 'summarize document [ID]' for a general overview"
        result += "\n3. Ask me to 'search documents for [your question]' to find relevant content"
        
        return result
        
    except DocumentAccessError as e:
        logger.error(f"Error listing documents: {e}")
        return f"I'm having trouble accessing the documents. Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error listing documents: {e}")
        return "I encountered an unexpected error while trying to access the documents."

@function_tool
async def analyze_specific_document(context: RunContext, document_id: str, question: str = None):
    """Analyze a specific uploaded document by ID and answer questions about it
    
    Args:
        document_id: The ID of the document to analyze
        question: Specific question about the document (optional)
    """
    try:
        logger.info(f"analyze_specific_document called with document_id: {document_id}, question: {question}")
        
        if question:
            # Get analysis for specific question
            logger.info(f"Getting analysis for question: {question}")
            doc_info = await analyze_document_with_question(document_id, question)
            content = doc_info['extractedText']
            logger.info(f"Successfully retrieved content for question, length: {len(content)}")
            # Return content directly to be added to LLM context
            return f"""DOCUMENT CONTENT FOR ANALYSIS:

Document: {doc_info.get('originalName', 'Unknown')}
Question: {question}

{content}

You now have access to this document's content. Please analyze it and answer the question based on the actual text above."""
        else:
            # Get full document content
            logger.info(f"Getting full document content")
            doc_info = await get_document_content(document_id)
            content = doc_info['content']
            logger.info(f"Successfully retrieved full content, length: {len(content)}")
            # Return content directly to be added to LLM context
            return f"""DOCUMENT CONTENT FOR ANALYSIS:

Document: {doc_info.get('originalName', 'Unknown')}

{content}

You now have access to this document's content. Please analyze it and answer any questions based on the actual text above."""
            
    except DocumentAccessError as e:
        logger.error(f"Error analyzing document {document_id}: {e}")
        return f"I'm having trouble accessing that document. Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error analyzing document {document_id}: {e}")
        return "I encountered an unexpected error while analyzing the document."

@function_tool
async def get_document_summary(context: RunContext, document_id: str):
    """Get a comprehensive summary of an uploaded document
    
    Args:
        document_id: The ID of the document to summarize
    """
    try:
        doc_info = await get_document_content(document_id)
        content = doc_info['content']
        
        # Return content directly to be added to LLM context
        return f"""DOCUMENT CONTENT FOR SUMMARY:

Document: {doc_info.get('originalName', 'Unknown')}

{content}

You now have access to this document's content. Please provide a comprehensive summary based on the actual text above."""
        
    except DocumentAccessError as e:
        logger.error(f"Error getting document summary {document_id}: {e}")
        return f"I'm having trouble accessing that document for summary. Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error getting document summary {document_id}: {e}")
        return "I encountered an unexpected error while trying to summarize the document."

@function_tool
async def search_documents_for_question(context: RunContext, question: str):
    """Search through all uploaded documents to find relevant information for a question
    
    Args:
        question: The question to search for in documents
    """
    try:
        docs = await get_backend_documents()
        
        if not docs:
            return "No documents are available to search through. Please upload documents first."
        
        relevant_docs = []
        question_words = question.lower().split()
        
        # Search through each document for relevance
        for doc in docs:
            try:
                doc_content = await get_document_content(doc['id'])
                content_lower = doc_content['content'].lower()
                
                # Simple keyword matching - can be improved with embeddings
                if any(word in content_lower for word in question_words):
                    relevant_docs.append({
                        'doc': doc,
                        'content': doc_content['content']
                    })
            except Exception as e:
                logger.warning(f"Could not search document {doc['id']}: {e}")
                continue
        
        if not relevant_docs:
            return f"I searched through {len(docs)} documents but couldn't find specific content related to your question: '{question}'. You can ask me to analyze any document directly."
        
        # If only one relevant document, return its content
        if len(relevant_docs) == 1:
            doc_data = relevant_docs[0]
            return f"""DOCUMENT CONTENT FOR ANALYSIS:

Document: {doc_data['doc'].get('originalName', 'Unknown')}
Question: {question}

{doc_data['content']}

You now have access to this document's content. Please analyze it and answer the question based on the actual text above."""
        
        # If multiple documents, combine and present them
        combined_results = []
        for i, doc_data in enumerate(relevant_docs[:3]):  # Limit to 3 documents
            readable_name = doc_data['doc']['originalName']
            if readable_name.endswith(('.pdf', '.docx', '.txt')):
                readable_name = readable_name.rsplit('.', 1)[0]
            
            # Truncate each document to fit multiple
            content = doc_data['content']
            content_preview = content[:1000] + "..." if len(content) > 1000 else content
            combined_results.append(f"--- {readable_name} ---\n{content_preview}")
        
        result = f"""DOCUMENT CONTENT FOR ANALYSIS:

I found {len(relevant_docs)} documents relevant to your question: "{question}"

{chr(10).join(combined_results)}

You now have access to these documents' content. Please analyze them and answer the question based on the actual text above."""
        
        return result
        
    except DocumentAccessError as e:
        logger.error(f"Error searching documents: {e}")
        return f"I'm having trouble searching through the documents. Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error searching documents: {e}")
        return "I encountered an unexpected error while searching through the documents."

@function_tool
async def test_document_access(context: RunContext):
    """Test if document access is working properly - diagnostic tool"""
    try:
        logger.info("Testing document access...")
        
        # Test 1: Check if we can reach the backend
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{BACKEND_URL}/health") as response:
                    if response.status == 200:
                        logger.info("✅ Backend health check successful")
                    else:
                        logger.warning(f"⚠️ Backend health check returned status {response.status}")
        except Exception as e:
            logger.error(f"❌ Backend health check failed: {e}")
            return f"Document access test failed: Cannot reach backend at {BACKEND_URL}. Error: {str(e)}"
        
        # Test 2: Try to list documents
        try:
            docs = await get_backend_documents()
            logger.info(f"✅ Document listing successful, found {len(docs)} documents")
            
            if docs:
                # Test 3: Try to access the first document's content
                first_doc = docs[0]
                try:
                    doc_content = await get_document_content(first_doc['id'])
                    logger.info(f"✅ Document content access successful for {first_doc['originalName']}")
                    return f"Document access test successful! Found {len(docs)} documents. Successfully accessed content from '{first_doc['originalName']}' ({len(doc_content['content'])} characters)."
                except Exception as e:
                    logger.error(f"❌ Document content access failed: {e}")
                    return f"Document access test partially successful. Found {len(docs)} documents but failed to access content: {str(e)}"
            else:
                return "Document access test successful. No documents are currently uploaded."
                
        except Exception as e:
            logger.error(f"❌ Document listing failed: {e}")
            return f"Document access test failed: Cannot list documents. Error: {str(e)}"
            
    except Exception as e:
        logger.error(f"❌ Document access test failed with unexpected error: {e}")
        return f"Document access test failed with unexpected error: {str(e)}"

@function_tool
async def inject_document_to_context(context: RunContext, document_id: str):
    """Inject document content directly into the LLM context for analysis
    
    Args:
        document_id: The ID of the document to inject into context
    """
    try:
        doc_info = await get_document_content(document_id)
        content = doc_info['content']
        
        # Return content in a format that gets added to LLM context
        return f"""DOCUMENT INJECTED INTO CONTEXT:

Document: {doc_info.get('originalName', 'Unknown')}
Content Length: {len(content)} characters

{content}

This document content has been added to your context. You can now analyze it and answer questions based on this content."""
        
    except DocumentAccessError as e:
        logger.error(f"Error injecting document {document_id}: {e}")
        return f"I'm having trouble accessing that document. Error: {str(e)}"
    except Exception as e:
        logger.error(f"Unexpected error injecting document {document_id}: {e}")
        return "I encountered an unexpected error while trying to access the document."

@function_tool
async def get_document_help(context: RunContext):
    """Get help and instructions for using document analysis tools"""
    return """📚 DOCUMENT ANALYSIS HELP

I can help you analyze uploaded documents! Here's how to use my tools:

🔍 AVAILABLE COMMANDS:
• "List documents" - See all uploaded documents with their IDs
• "Analyze document [ID] with question [your question]" - Get specific answers about a document
• "Summarize document [ID]" - Get a comprehensive summary of a document
• "Search documents for [your question]" - Find relevant content across all documents
• "Test document access" - Check if document access is working properly

📋 EXAMPLE USAGE:
• "List documents" → Shows all available documents with IDs
• "Analyze document 1234567890 with question What is the main topic?" → Gets specific answer
• "Summarize document 1234567890" → Provides comprehensive summary
• "Search documents for climate change" → Finds relevant content across documents

💡 TIPS:
• Always start by listing documents to see what's available
• Use the document ID (shown in the list) when asking for analysis
• Ask specific questions for better, more focused answers
• If something doesn't work, try "test document access" to diagnose issues

Ready to analyze your documents! Start by asking me to "list documents"."""
"""
Text processing utilities for Vocastant agent
"""

def clean_text_for_tts(text):
    """Clean text to remove formatting artifacts that shouldn't be read by TTS"""
    if not text:
        return text
    
    # Remove markdown formatting
    text = text.replace('*', '').replace('_', '').replace('`', '')
    
    # Remove excessive whitespace and newlines
    text = ' '.join(text.split())
    
    # Remove JSON formatting artifacts
    text = text.replace('{', '').replace('}', '').replace('[', '').replace(']', '')
    text = text.replace('"', '').replace(',', ' ')
    
    # Remove encoded filenames and use readable names
    text = text.replace('document-', 'Document ')
    text = text.replace('-', ' ')
    
    # Clean up common artifacts
    text = text.replace('originalName', 'name')
    text = text.replace('wordCount', 'words')
    text = text.replace('uploadedAt', 'uploaded')
    
    return text

def get_readable_filename(filename):
    """Convert filename to readable format"""
    if filename.startswith('document-'):
        return "Uploaded Document"
    elif filename.endswith('.pdf'):
        return filename[:-4]
    elif filename.endswith('.docx'):
        return filename[:-5]
    elif filename.endswith('.txt'):
        return filename[:-4]
    return filename

def truncate_content(content, max_length=2500, add_ellipsis=True):
    """Safely truncate content while preserving structure"""
    if len(content) <= max_length:
        return content
    
    truncated = content[:max_length]
    
    # Try to truncate at a sentence boundary
    last_sentence = max(
        truncated.rfind('.'),
        truncated.rfind('!'),
        truncated.rfind('?')
    )
    
    if last_sentence > max_length * 0.7:  # If we can keep at least 70% of content
        truncated = truncated[:last_sentence + 1]
    
    if add_ellipsis:
        truncated += "\n\n[Content truncated...]"
    
    return truncated
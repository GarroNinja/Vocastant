const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Helper function to extract text from different file types
const extractTextFromFile = async (s3Helper, s3Key, mimetype) => {
  try {
    const fileStream = await s3Helper.getFileStream(s3Key);
    let extractedText = '';

    if (mimetype === 'application/pdf') {
      // For PDF files
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For Word files
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
      // For text files
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      extractedText = Buffer.concat(chunks).toString('utf8');
    }

    return extractedText;
  } catch (error) {
    console.error('❌ Text extraction error:', error);
    return '';
  }
};

module.exports = { extractTextFromFile };

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  apiVersion: '2006-03-01'
});

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'vocastant-documents';

// Create S3 bucket if it doesn't exist
const createBucketIfNotExists = async () => {
  try {
    await s3.headBucket({ Bucket: S3_BUCKET }).promise();
    console.log(`✅ S3 bucket '${S3_BUCKET}' exists`);
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`🔄 Creating S3 bucket '${S3_BUCKET}'...`);
      try {
        await s3.createBucket({
          Bucket: S3_BUCKET,
          ACL: 'private'
        }).promise();
        
        // Add bucket policy for security
        const bucketPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'DenyInsecureConnections',
              Effect: 'Deny',
              Principal: '*',
              Action: 's3:*',
              Resource: [
                `arn:aws:s3:::${S3_BUCKET}/*`,
                `arn:aws:s3:::${S3_BUCKET}`
              ],
              Condition: {
                Bool: {
                  'aws:SecureTransport': 'false'
                }
              }
            }
          ]
        };
        
        await s3.putBucketPolicy({
          Bucket: S3_BUCKET,
          Policy: JSON.stringify(bucketPolicy)
        }).promise();
        
        console.log(`✅ S3 bucket '${S3_BUCKET}' created successfully`);
      } catch (createError) {
        console.error('❌ Failed to create S3 bucket:', createError);
        throw createError;
      }
    } else {
      console.error('❌ Error checking S3 bucket:', error);
      throw error;
    }
  }
};

// Configure multer for S3 uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: S3_BUCKET,
    acl: 'private', // Private files, access via presigned URLs
    key: function (req, file, cb) {
      // Generate unique key: rooms/roomname/documents/uuid-originalname
      // Note: req.body.roomName is not available here, so we'll use a placeholder
      // The actual room name will be used when saving to database
      const uniqueFilename = `${uuidv4()}-${file.originalname}`;
      const s3Key = `documents/${uniqueFilename}`;
      console.log(`📁 S3 key generated: ${s3Key} (room will be set during database save)`);
      cb(null, s3Key);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
        // Note: roomName will be added when saving to database
      });
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow specific file types
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: PDF, Word, Text, Markdown`), false);
    }
  }
});

// S3 helper functions
const s3Helper = {
  // Generate presigned URL for file access
  async getPresignedUrl(s3Key, expiresInSeconds = 3600) {
    try {
      const params = {
        Bucket: S3_BUCKET,
        Key: s3Key,
        Expires: expiresInSeconds,
        ResponseContentDisposition: 'inline' // For viewing in browser
      };
      
      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('❌ Error generating presigned URL:', error);
      throw error;
    }
  },

  // Generate presigned URL for download
  async getDownloadUrl(s3Key, filename, expiresInSeconds = 3600) {
    try {
      const params = {
        Bucket: S3_BUCKET,
        Key: s3Key,
        Expires: expiresInSeconds,
        ResponseContentDisposition: `attachment; filename="${filename}"`
      };
      
      const url = await s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error('❌ Error generating download URL:', error);
      throw error;
    }
  },

  // Delete file from S3
  async deleteFile(s3Key) {
    try {
      await s3.deleteObject({
        Bucket: S3_BUCKET,
        Key: s3Key
      }).promise();
      console.log(`✅ Deleted file from S3: ${s3Key}`);
    } catch (error) {
      console.error('❌ Error deleting file from S3:', error);
      throw error;
    }
  },

  // Get file stream from S3
  async getFileStream(s3Key) {
    try {
      const params = {
        Bucket: S3_BUCKET,
        Key: s3Key
      };
      
      return s3.getObject(params).createReadStream();
    } catch (error) {
      console.error('❌ Error getting file stream from S3:', error);
      throw error;
    }
  },

  // Check if file exists
  async fileExists(s3Key) {
    try {
      await s3.headObject({
        Bucket: S3_BUCKET,
        Key: s3Key
      }).promise();
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
};

// Clean up S3 objects for a specific room
const cleanupRoomDocuments = async (roomName) => {
  try {
    const sanitizedRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const prefix = `rooms/${sanitizedRoomName}/documents/`;
    
    console.log(`🧹 Cleaning up S3 objects with prefix: ${prefix}`);
    
    // List all objects with the room prefix
    const listParams = {
      Bucket: S3_BUCKET,
      Prefix: prefix
    };
    
    const objects = await s3.listObjectsV2(listParams).promise();
    
    if (objects.Contents && objects.Contents.length > 0) {
      // Delete all objects in the room
      const deleteParams = {
        Bucket: S3_BUCKET,
        Delete: {
          Objects: objects.Contents.map(obj => ({ Key: obj.Key }))
        }
      };
      
      await s3.deleteObjects(deleteParams).promise();
      console.log(`✅ Cleaned up ${objects.Contents.length} S3 objects for room: ${roomName}`);
    } else {
      console.log(`ℹ️ No S3 objects found for room: ${roomName}`);
    }
  } catch (error) {
    console.error(`❌ Failed to cleanup S3 objects for room ${roomName}:`, error);
    throw error;
  }
};

// Delete a specific document from S3
const deleteDocumentFromS3 = async (s3Key) => {
  try {
    console.log(`🗑️ Deleting S3 object: ${s3Key}`);
    
    const deleteParams = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };
    
    await s3.deleteObject(deleteParams).promise();
    console.log(`✅ Successfully deleted S3 object: ${s3Key}`);
  } catch (error) {
    console.error(`❌ Failed to delete S3 object ${s3Key}:`, error);
    throw error;
  }
};

module.exports = {
  s3,
  upload,
  s3Helper,
  createBucketIfNotExists,
  S3_BUCKET,
  cleanupRoomDocuments,
  deleteDocumentFromS3
};
const { db } = require('../database');

// Middleware to get room info from request
const getRoomMiddleware = async (req, res, next) => {
  try {
    const roomName = req.params.roomName || req.body.roomName || req.query.roomName;
    
    if (!roomName) {
      return res.status(400).json({ 
        error: 'Room name is required',
        details: 'Please provide roomName in params, body, or query'
      });
    }

    // Get or create room
    const room = await db.createRoom(roomName);
    if (!room) {
      return res.status(500).json({ 
        error: 'Failed to create or get room',
        details: 'Database operation failed'
      });
    }

    // Attach room to request for later use
    req.room = room;
    next();
  } catch (error) {
    console.error('❌ Room middleware error:', error);
    res.status(500).json({ 
      error: 'Room middleware failed',
      details: error.message 
    });
  }
};

module.exports = { getRoomMiddleware };

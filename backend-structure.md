# Face Memory Challenge - Backend Architecture

## Project Structure
```
face-memory-backend/
├── server.js                 # Main server file
├── package.json
├── config/
│   ├── database.js           # Database connections
│   └── socket.js             # Socket.IO configuration
├── models/
│   ├── User.js               # User model
│   ├── Game.js               # Game session model
│   └── GameResult.js         # Game results model
├── routes/
│   ├── auth.js               # Authentication routes
│   ├── game.js               # Game management routes
│   └── upload.js             # Image upload routes
├── controllers/
│   ├── gameController.js     # Game logic controller
│   ├── userController.js     # User management
│   └── socketController.js   # Socket event handlers
├── middleware/
│   ├── auth.js               # Authentication middleware
│   └── upload.js             # File upload middleware
├── utils/
│   ├── gameLogic.js          # Game scoring and validation
│   └── imageProcessor.js     # Image processing utilities
└── uploads/                  # Uploaded images storage
```

## Key Features Implementation

### 1. Real-time Game Flow
- **Room Creation**: Host creates game room with unique code
- **Player Joining**: Players join using room code
- **Image Upload**: Host uploads face image, shared with all players
- **Target Calibration**: Host sets target position
- **Synchronized Gameplay**: All players see same image simultaneously
- **Real-time Scoring**: Instant score updates for all players
- **Live Leaderboard**: Real-time ranking updates

### 2. Socket.IO Events
```javascript
// Client to Server Events
'create-room'           // Host creates new game room
'join-room'             // Player joins existing room
'upload-image'          // Host uploads game image
'calibrate-target'      // Host sets target position
'start-game'            // Host starts the game
'player-click'          // Player clicks on grid
'next-round'            // Move to next round

// Server to Client Events
'room-created'          // Room successfully created
'player-joined'         // New player joined room
'player-left'           // Player left room
'image-uploaded'        // Image ready for calibration
'target-calibrated'     // Target position set
'game-started'          // Game begins
'show-image'            // Display image to all players
'hide-image'            // Hide image, start guessing
'player-scored'         // Player's score update
'round-results'         // Round results for all players
'game-ended'            // Final game results
'leaderboard-update'    // Real-time leaderboard
```

### 3. Game State Management
```javascript
// Game Room State
{
  roomCode: "MEMORY2024",
  hostId: "user123",
  players: [
    {
      id: "user123",
      name: "Player 1",
      score: 0,
      isHost: true,
      connected: true
    }
  ],
  gameState: "lobby", // lobby, playing, results, ended
  currentRound: 0,
  totalRounds: 10,
  gameImage: "uploads/image123.jpg",
  targetPosition: { x: 45, y: 30 },
  roundStartTime: null,
  settings: {
    viewTime: 3000,      // 3 seconds to view
    guessTime: 20000     // 20 seconds to guess
  }
}
```

## Technology Benefits

### Socket.IO Advantages:
- **Real-time Sync**: All players see actions instantly
- **Room Management**: Built-in room/namespace support
- **Automatic Reconnection**: Handles network issues gracefully
- **Cross-platform**: Works on web, mobile, desktop
- **Scalable**: Can handle thousands of concurrent connections

### Redis Benefits:
- **Fast Game State**: In-memory storage for real-time data
- **Session Management**: Quick player session lookups
- **Leaderboards**: Sorted sets for rankings
- **Pub/Sub**: For cross-server communication if scaling

### MongoDB Benefits:
- **User Profiles**: Persistent user data and statistics
- **Game History**: Store completed games and results
- **Analytics**: Track game performance and user engagement
- **Flexible Schema**: Easy to add new features

## Deployment Options

### 1. Simple Deployment
- **Heroku**: Easy deployment with Redis add-on
- **Railway**: Modern platform with built-in Redis
- **Render**: Free tier with PostgreSQL/Redis

### 2. Scalable Deployment
- **AWS**: EC2 + ElastiCache (Redis) + DocumentDB
- **Google Cloud**: Compute Engine + Memorystore + Firestore
- **DigitalOcean**: Droplets + Managed Redis + MongoDB

### 3. Serverless Options
- **Vercel**: For frontend + API routes
- **Supabase**: Real-time database with built-in auth
- **Firebase**: Real-time database + hosting + auth

## Performance Considerations

### Real-time Optimization:
- **Event Throttling**: Limit click events to prevent spam
- **State Compression**: Minimize data sent over websockets
- **Connection Pooling**: Efficient database connections
- **Image Optimization**: Compress uploaded images
- **CDN**: Serve static assets from CDN

### Scalability Features:
- **Horizontal Scaling**: Multiple server instances
- **Load Balancing**: Distribute connections across servers
- **Redis Clustering**: Scale Redis for more concurrent games
- **Database Sharding**: Partition data across multiple databases
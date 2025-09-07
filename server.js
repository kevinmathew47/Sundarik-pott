const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const redis = require('redis');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Redis client for game state management
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Game state management
class GameManager {
    constructor() {
        this.games = new Map(); // In-memory for demo, use Redis in production
    }

    createGame(hostId, hostName) {
        const roomCode = this.generateRoomCode();
        const game = {
            roomCode,
            hostId,
            players: [{
                id: hostId,
                name: hostName,
                score: 0,
                isHost: true,
                connected: true
            }],
            gameState: 'lobby',
            currentRound: 0,
            totalRounds: 10,
            gameImage: null,
            targetPosition: null,
            roundStartTime: null,
            settings: {
                viewTime: 3000,
                guessTime: 20000
            },
            createdAt: new Date()
        };
        
        this.games.set(roomCode, game);
        return game;
    }

    joinGame(roomCode, playerId, playerName) {
        const game = this.games.get(roomCode);
        if (!game) return null;
        
        // Check if player already exists
        const existingPlayer = game.players.find(p => p.id === playerId);
        if (existingPlayer) {
            existingPlayer.connected = true;
            return game;
        }
        
        // Add new player
        game.players.push({
            id: playerId,
            name: playerName,
            score: 0,
            isHost: false,
            connected: true
        });
        
        return game;
    }

    removePlayer(roomCode, playerId) {
        const game = this.games.get(roomCode);
        if (!game) return null;
        
        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            game.players[playerIndex].connected = false;
            
            // If host leaves, assign new host
            if (game.players[playerIndex].isHost) {
                const nextHost = game.players.find(p => p.connected && p.id !== playerId);
                if (nextHost) {
                    nextHost.isHost = true;
                    game.hostId = nextHost.id;
                }
            }
        }
        
        return game;
    }

    updatePlayerScore(roomCode, playerId, points) {
        const game = this.games.get(roomCode);
        if (!game) return null;
        
        const player = game.players.find(p => p.id === playerId);
        if (player) {
            player.score += points;
        }
        
        return game;
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    getLeaderboard(roomCode) {
        const game = this.games.get(roomCode);
        if (!game) return [];
        
        return game.players
            .filter(p => p.connected)
            .sort((a, b) => b.score - a.score)
            .map((player, index) => ({
                rank: index + 1,
                name: player.name,
                score: player.score,
                id: player.id
            }));
    }
}

const gameManager = new GameManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create game room
    socket.on('create-room', (data) => {
        const { playerName } = data;
        const game = gameManager.createGame(socket.id, playerName);
        
        socket.join(game.roomCode);
        socket.emit('room-created', {
            roomCode: game.roomCode,
            game: game
        });
        
        console.log(`Room ${game.roomCode} created by ${playerName}`);
    });

    // Join game room
    socket.on('join-room', (data) => {
        const { roomCode, playerName } = data;
        const game = gameManager.joinGame(roomCode, socket.id, playerName);
        
        if (!game) {
            socket.emit('error', { message: 'Game room not found' });
            return;
        }
        
        socket.join(roomCode);
        socket.emit('room-joined', { game });
        socket.to(roomCode).emit('player-joined', {
            player: game.players.find(p => p.id === socket.id),
            playerCount: game.players.filter(p => p.connected).length
        });
        
        console.log(`${playerName} joined room ${roomCode}`);
    });

    // Upload game image
    socket.on('upload-image', async (data) => {
        const { roomCode, imageData } = data;
        const game = gameManager.games.get(roomCode);
        
        if (!game || game.hostId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }
        
        try {
            // Process base64 image
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Optimize image with Sharp
            const filename = `game-${Date.now()}-${uuidv4()}.jpg`;
            const filepath = path.join('uploads', filename);
            
            await sharp(buffer)
                .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toFile(filepath);
            
            game.gameImage = `/uploads/${filename}`;
            
            io.to(roomCode).emit('image-uploaded', {
                imageUrl: game.gameImage
            });
            
        } catch (error) {
            console.error('Image upload error:', error);
            socket.emit('error', { message: 'Image upload failed' });
        }
    });

    // Set target position
    socket.on('calibrate-target', (data) => {
        const { roomCode, position } = data;
        const game = gameManager.games.get(roomCode);
        
        if (!game || game.hostId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }
        
        game.targetPosition = position;
        io.to(roomCode).emit('target-calibrated', { position });
    });

    // Start game
    socket.on('start-game', (data) => {
        const { roomCode } = data;
        const game = gameManager.games.get(roomCode);
        
        if (!game || game.hostId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }
        
        if (!game.gameImage || !game.targetPosition) {
            socket.emit('error', { message: 'Game not ready - missing image or target' });
            return;
        }
        
        game.gameState = 'playing';
        game.currentRound = 1;
        
        io.to(roomCode).emit('game-started', { game });
        
        // Start first round
        setTimeout(() => {
            startRound(roomCode);
        }, 2000);
    });

    // Player click
    socket.on('player-click', (data) => {
        const { roomCode, position, timestamp } = data;
        const game = gameManager.games.get(roomCode);
        
        if (!game || game.gameState !== 'guessing') {
            return;
        }
        
        // Calculate score based on accuracy
        const points = calculateScore(position, game.targetPosition);
        gameManager.updatePlayerScore(roomCode, socket.id, points);
        
        const player = game.players.find(p => p.id === socket.id);
        
        io.to(roomCode).emit('player-scored', {
            playerId: socket.id,
            playerName: player.name,
            points: points,
            position: position,
            totalScore: player.score
        });
        
        // Update leaderboard
        const leaderboard = gameManager.getLeaderboard(roomCode);
        io.to(roomCode).emit('leaderboard-update', { leaderboard });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find and update player status in all games
        for (const [roomCode, game] of gameManager.games) {
            const player = game.players.find(p => p.id === socket.id);
            if (player) {
                gameManager.removePlayer(roomCode, socket.id);
                socket.to(roomCode).emit('player-left', {
                    playerId: socket.id,
                    playerName: player.name,
                    playerCount: game.players.filter(p => p.connected).length
                });
                break;
            }
        }
    });
});

// Game logic functions
function startRound(roomCode) {
    const game = gameManager.games.get(roomCode);
    if (!game) return;
    
    game.gameState = 'viewing';
    game.roundStartTime = Date.now();
    
    // Show image to all players
    io.to(roomCode).emit('show-image', {
        round: game.currentRound,
        imageUrl: game.gameImage,
        targetPosition: game.targetPosition,
        viewTime: game.settings.viewTime
    });
    
    // Hide image and start guessing phase
    setTimeout(() => {
        game.gameState = 'guessing';
        io.to(roomCode).emit('hide-image', {
            guessTime: game.settings.guessTime
        });
        
        // End round after guess time
        setTimeout(() => {
            endRound(roomCode);
        }, game.settings.guessTime);
        
    }, game.settings.viewTime);
}

function endRound(roomCode) {
    const game = gameManager.games.get(roomCode);
    if (!game) return;
    
    game.gameState = 'results';
    
    const leaderboard = gameManager.getLeaderboard(roomCode);
    
    io.to(roomCode).emit('round-ended', {
        round: game.currentRound,
        leaderboard: leaderboard,
        correctPosition: game.targetPosition
    });
    
    // Check if game is complete
    if (game.currentRound >= game.totalRounds) {
        setTimeout(() => {
            endGame(roomCode);
        }, 5000);
    } else {
        // Start next round
        setTimeout(() => {
            game.currentRound++;
            startRound(roomCode);
        }, 5000);
    }
}

function endGame(roomCode) {
    const game = gameManager.games.get(roomCode);
    if (!game) return;
    
    game.gameState = 'ended';
    const finalLeaderboard = gameManager.getLeaderboard(roomCode);
    
    io.to(roomCode).emit('game-ended', {
        finalLeaderboard: finalLeaderboard,
        winner: finalLeaderboard[0]
    });
    
    // Clean up game after 10 minutes
    setTimeout(() => {
        gameManager.games.delete(roomCode);
    }, 10 * 60 * 1000);
}

function calculateScore(clickPosition, targetPosition) {
    const distance = Math.sqrt(
        Math.pow(clickPosition.x - targetPosition.x, 2) + 
        Math.pow(clickPosition.y - targetPosition.y, 2)
    );
    
    // Score based on distance (closer = higher score)
    if (distance <= 5) return 100;      // Perfect hit
    if (distance <= 15) return 75;     // Very close
    if (distance <= 30) return 50;     // Close
    if (distance <= 50) return 25;     // Near
    if (distance <= 100) return 10;    // Far
    return 0;                          // Too far
}

// API Routes
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        
        // Optimize uploaded image
        const optimizedPath = `uploads/optimized-${req.file.filename}`;
        await sharp(req.file.path)
            .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toFile(optimizedPath);
        
        res.json({
            success: true,
            imageUrl: `/uploads/optimized-${req.file.filename}`
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeGames: gameManager.games.size,
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎯 Face Memory Challenge Server running on port ${PORT}`);
    console.log(`🚀 Socket.IO enabled for real-time multiplayer`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
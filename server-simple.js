const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
// const { v4: uuidv4 } = require('uuid'); // Removed unused import

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // Serve static files from current directory

// Simple in-memory storage (replace with Redis in production)
class SimpleGameManager {
    constructor() {
        this.games = new Map();
        this.playerRooms = new Map(); // Track which room each player is in
    }

    createAdminRoom(adminId, roomId, settings) {
        const game = {
            roomCode: roomId,
            adminId: adminId,
            players: [],
            gameState: 'waiting',
            currentRound: 0,
            totalRounds: settings.totalRounds || 10,
            gameImage: null,
            targetPosition: null,
            roundStartTime: null,
            settings: {
                viewTime: (settings.viewTime || 5) * 1000,
                guessTime: (settings.guessTime || 20) * 1000,
                minPlayers: settings.minPlayers || 2
            },
            createdAt: new Date()
        };

        this.games.set(roomId, game);
        this.playerRooms.set(adminId, roomId);
        return game;
    }

    joinGame(roomCode, playerId, playerName) {
        const game = this.games.get(roomCode);
        if (!game) return null;

        // Check if player already exists
        const existingPlayer = game.players.find(p => p.id === playerId);
        if (existingPlayer) {
            existingPlayer.connected = true;
            this.playerRooms.set(playerId, roomCode);
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

        this.playerRooms.set(playerId, roomCode);
        return game;
    }

    removePlayer(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) return null;

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

        this.playerRooms.delete(playerId);
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

        // Make sure code is unique
        if (this.games.has(result)) {
            return this.generateRoomCode();
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

    getPlayerRoom(playerId) {
        return this.playerRooms.get(playerId);
    }
}

const gameManager = new SimpleGameManager();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Admin creates room
    socket.on('admin-create-room', (data) => {
        try {
            const { roomId, settings } = data;

            if (!roomId || roomId.trim().length === 0) {
                socket.emit('error', { message: 'Room ID is required' });
                return;
            }

            // Check if room already exists
            if (gameManager.games.has(roomId)) {
                socket.emit('error', { message: 'Room ID already exists' });
                return;
            }

            const game = gameManager.createAdminRoom(socket.id, roomId, settings);

            socket.join(roomId);
            socket.emit('admin-room-created', {
                roomId: roomId,
                game: game
            });

            console.log(`Admin room ${roomId} created`);
        } catch (error) {
            console.error('Create admin room error:', error);
            socket.emit('error', { message: 'Failed to create room' });
        }
    });

    // Admin closes room
    socket.on('admin-close-room', (data) => {
        try {
            const { roomId } = data;
            const game = gameManager.games.get(roomId);

            if (!game || game.adminId !== socket.id) {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }

            // Notify all players
            socket.to(roomId).emit('room-closed', { message: 'Room has been closed by admin' });

            // Remove game
            gameManager.games.delete(roomId);
            console.log(`Admin room ${roomId} closed`);
        } catch (error) {
            console.error('Close room error:', error);
        }
    });

    // Join game room
    socket.on('join-room', (data) => {
        try {
            const { roomCode, playerName } = data;

            if (!roomCode || !playerName) {
                socket.emit('error', { message: 'Room code and player name are required' });
                return;
            }

            const game = gameManager.joinGame(roomCode.toUpperCase(), socket.id, playerName.trim());

            if (!game) {
                socket.emit('error', { message: 'Game room not found' });
                return;
            }

            socket.join(roomCode.toUpperCase());
            socket.emit('room-joined', { game });

            const newPlayer = game.players.find(p => p.id === socket.id);

            // Notify other players
            socket.to(roomCode.toUpperCase()).emit('player-joined', {
                player: newPlayer,
                playerCount: game.players.filter(p => p.connected).length
            });

            // Notify admin if this is an admin room
            if (game.adminId) {
                io.to(game.adminId).emit('admin-player-joined', {
                    player: newPlayer,
                    playerCount: game.players.filter(p => p.connected).length
                });
            }

            console.log(`${playerName} joined room ${roomCode.toUpperCase()}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Upload game image (base64)
    socket.on('upload-image', (data) => {
        try {
            const { roomCode, imageData } = data;
            const game = gameManager.games.get(roomCode);

            if (!game || game.hostId !== socket.id) {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }

            // Store base64 image directly (in production, save to file/cloud storage)
            game.gameImage = imageData;

            io.to(roomCode).emit('image-uploaded', {
                imageUrl: imageData
            });

            console.log(`Image uploaded for room ${roomCode}`);
        } catch (error) {
            console.error('Image upload error:', error);
            socket.emit('error', { message: 'Image upload failed' });
        }
    });

    // Set target position
    socket.on('calibrate-target', (data) => {
        try {
            const { roomCode, position } = data;
            const game = gameManager.games.get(roomCode);

            if (!game || game.hostId !== socket.id) {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }

            game.targetPosition = position;
            io.to(roomCode).emit('target-calibrated', { position });

            console.log(`Target calibrated for room ${roomCode}`);
        } catch (error) {
            console.error('Calibrate target error:', error);
            socket.emit('error', { message: 'Failed to calibrate target' });
        }
    });

    // Admin starts game
    socket.on('admin-start-game', (data) => {
        try {
            const { roomId, gameImage, targetPosition, settings } = data;
            const game = gameManager.games.get(roomId);

            if (!game || game.adminId !== socket.id) {
                socket.emit('error', { message: 'Unauthorized' });
                return;
            }

            if (!gameImage || !targetPosition) {
                socket.emit('error', { message: 'Game not ready - missing image or target' });
                return;
            }

            const connectedPlayers = game.players.filter(p => p.connected);
            if (connectedPlayers.length < game.settings.minPlayers) {
                socket.emit('error', { message: `Need at least ${game.settings.minPlayers} players to start` });
                return;
            }

            // Update game with admin settings
            game.gameImage = gameImage;
            game.targetPosition = targetPosition;
            game.settings = {
                viewTime: settings.viewTime * 1000,
                guessTime: settings.guessTime * 1000,
                minPlayers: settings.minPlayers
            };
            game.totalRounds = settings.totalRounds;
            game.gameState = 'playing';
            game.currentRound = 1;

            // Notify admin
            socket.emit('admin-game-started', { game });

            // Notify all players
            io.to(roomId).emit('game-started', { game });

            console.log(`Admin started game in room ${roomId}`);

            // Start first round
            setTimeout(() => {
                startRound(roomId);
            }, 2000);
        } catch (error) {
            console.error('Admin start game error:', error);
            socket.emit('error', { message: 'Failed to start game' });
        }
    });

    // Admin controls
    socket.on('admin-pause-game', (data) => {
        const { roomId } = data;
        const game = gameManager.games.get(roomId);

        if (!game || game.adminId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }

        game.gameState = 'paused';
        io.to(roomId).emit('game-paused');
    });

    socket.on('admin-next-round', (data) => {
        const { roomId } = data;
        const game = gameManager.games.get(roomId);

        if (!game || game.adminId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }

        if (game.currentRound < game.totalRounds) {
            game.currentRound++;
            startRound(roomId);
        }
    });

    socket.on('admin-end-game', (data) => {
        const { roomId } = data;
        const game = gameManager.games.get(roomId);

        if (!game || game.adminId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }

        endGame(roomId);
    });

    socket.on('admin-kick-player', (data) => {
        const { roomId, playerId } = data;
        const game = gameManager.games.get(roomId);

        if (!game || game.adminId !== socket.id) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
        }

        const player = game.players.find(p => p.id === playerId);
        if (player) {
            // Remove player
            gameManager.removePlayer(playerId);

            // Notify player they were kicked
            io.to(playerId).emit('kicked', { message: 'You have been removed from the game by the admin' });

            // Notify admin
            socket.emit('admin-player-left', {
                playerId: playerId,
                playerName: player.name
            });
        }
    });

    // Player click
    socket.on('player-click', (data) => {
        try {
            const { roomCode, position } = data;
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

            // Notify admin
            if (game.adminId) {
                io.to(game.adminId).emit('admin-player-scored', {
                    playerId: socket.id,
                    playerName: player.name,
                    points: points,
                    leaderboard: leaderboard
                });
            }

            console.log(`${player.name} scored ${points} points in room ${roomCode}`);
        } catch (error) {
            console.error('Player click error:', error);
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        try {
            console.log('User disconnected:', socket.id);

            const roomCode = gameManager.getPlayerRoom(socket.id);
            if (roomCode) {
                const game = gameManager.removePlayer(socket.id);
                if (game) {
                    const player = game.players.find(p => p.id === socket.id);
                    if (player) {
                        socket.to(roomCode).emit('player-left', {
                            playerId: socket.id,
                            playerName: player.name,
                            playerCount: game.players.filter(p => p.connected).length
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    });
});

// Game logic functions
function startRound(roomCode) {
    const game = gameManager.games.get(roomCode);
    if (!game) return;

    game.gameState = 'viewing';
    game.roundStartTime = Date.now();

    // Notify admin
    if (game.adminId) {
        io.to(game.adminId).emit('admin-round-update', {
            round: game.currentRound,
            state: 'viewing',
            timeRemaining: game.settings.viewTime / 1000
        });
    }

    // Show image to all players
    io.to(roomCode).emit('show-image', {
        round: game.currentRound,
        imageUrl: game.gameImage,
        targetPosition: game.targetPosition,
        viewTime: game.settings.viewTime
    });

    console.log(`Round ${game.currentRound} started in room ${roomCode}`);

    // Hide image and start guessing phase
    setTimeout(() => {
        game.gameState = 'guessing';

        // Notify admin
        if (game.adminId) {
            io.to(game.adminId).emit('admin-round-update', {
                round: game.currentRound,
                state: 'guessing',
                timeRemaining: game.settings.guessTime / 1000
            });
        }

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

    console.log(`Round ${game.currentRound} ended in room ${roomCode}`);

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
        winner: finalLeaderboard[0] || null
    });

    console.log(`Game ended in room ${roomCode}`);

    // Clean up game after 10 minutes
    setTimeout(() => {
        gameManager.games.delete(roomCode);
        console.log(`Room ${roomCode} cleaned up`);
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

// Health check endpoint
app.get('/health', (_, res) => {
    res.json({
        status: 'healthy',
        activeGames: gameManager.games.size,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Serve static files from current directory
app.use(express.static('.'));

// Serve main game page
app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(404).send('Game page not found');
        }
    });
});

// Serve admin panel
app.get('/admin.html', (_, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'), (err) => {
        if (err) {
            console.error('Error serving admin.html:', err);
            res.status(404).send('Admin panel not found');
        }
    });
});

// Serve admin panel (alternative route)
app.get('/admin', (_, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'), (err) => {
        if (err) {
            console.error('Error serving admin.html:', err);
            res.status(404).send('Admin panel not found');
        }
    });
});

// Health check endpoint
app.get('/status', (_, res) => {
    res.send(`
        <h1>🎯 Face Memory Challenge Server</h1>
        <p>Server is running and ready for multiplayer games!</p>
        <p>Active Games: ${gameManager.games.size}</p>
        <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
        <p><a href="/">🎮 Play Game</a> | <a href="/admin.html">👑 Admin Panel</a></p>
        <p>Current directory: ${__dirname}</p>
    `);
});

// Debug route to list files
app.get('/debug', (_, res) => {
    const fs = require('fs');
    try {
        const files = fs.readdirSync(__dirname);
        res.json({
            directory: __dirname,
            files: files,
            hasIndexHtml: files.includes('index.html'),
            hasAdminHtml: files.includes('admin.html')
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎯 Face Memory Challenge Server running on port ${PORT}`);
    console.log(`🚀 Socket.IO enabled for real-time multiplayer`);
    console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
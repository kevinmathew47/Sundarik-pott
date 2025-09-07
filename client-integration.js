// Frontend Socket.IO Integration for Face Memory Challenge
// Add this to your existing script.js file

class MultiplayerGameClient {
    constructor() {
        // Initialize Socket.IO connection
        this.socket = io('http://localhost:3000'); // Change to your server URL
        this.roomCode = null;
        this.playerId = null;
        this.isHost = false;
        this.gameState = 'disconnected';
        
        this.initializeSocketListeners();
    }

    initializeSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
            this.gameState = 'connected';
            this.showNotification('🌐 Connected to server!', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.gameState = 'disconnected';
            this.showNotification('❌ Connection lost. Reconnecting...', 'error');
        });

        // Room management events
        this.socket.on('room-created', (data) => {
            this.roomCode = data.roomCode;
            this.isHost = true;
            this.gameState = 'lobby';
            
            // Update UI with room code
            document.querySelector('.game-code strong').textContent = this.roomCode;
            this.showNotification(`🎮 Room ${this.roomCode} created!`, 'success');
            
            this.updateGameState(data.game);
        });

        this.socket.on('room-joined', (data) => {
            this.roomCode = data.game.roomCode;
            this.gameState = 'lobby';
            
            this.showNotification(`🎯 Joined room ${this.roomCode}!`, 'success');
            this.updateGameState(data.game);
        });

        this.socket.on('player-joined', (data) => {
            this.showNotification(`👋 ${data.player.name} joined the game!`, 'info');
            this.updatePlayerCount(data.playerCount);
            this.addPlayerToUI(data.player);
        });

        this.socket.on('player-left', (data) => {
            this.showNotification(`👋 ${data.playerName} left the game`, 'info');
            this.updatePlayerCount(data.playerCount);
            this.removePlayerFromUI(data.playerId);
        });

        // Game flow events
        this.socket.on('image-uploaded', (data) => {
            this.showNotification('📸 Game image uploaded!', 'success');
            // Update image preview for all players
            this.updateImagePreview(data.imageUrl);
        });

        this.socket.on('target-calibrated', (data) => {
            this.showNotification('🎯 Target position set!', 'success');
            this.targetPosition = data.position;
        });

        this.socket.on('game-started', (data) => {
            this.showNotification('🚀 Game starting!', 'success');
            this.gameState = 'playing';
            this.switchToGamePhase();
        });

        this.socket.on('show-image', (data) => {
            this.showImagePhase(data);
        });

        this.socket.on('hide-image', (data) => {
            this.startGuessingPhase(data.guessTime);
        });

        this.socket.on('player-scored', (data) => {
            this.handlePlayerScore(data);
        });

        this.socket.on('leaderboard-update', (data) => {
            this.updateLeaderboard(data.leaderboard);
        });

        this.socket.on('round-ended', (data) => {
            this.showRoundResults(data);
        });

        this.socket.on('game-ended', (data) => {
            this.showFinalResults(data);
        });

        // Error handling
        this.socket.on('error', (data) => {
            this.showNotification(`❌ ${data.message}`, 'error');
        });
    }

    // Host functions
    createRoom(playerName) {
        this.socket.emit('create-room', { playerName });
    }

    uploadGameImage(imageData) {
        if (!this.isHost) {
            this.showNotification('❌ Only host can upload images', 'error');
            return;
        }
        
        this.socket.emit('upload-image', {
            roomCode: this.roomCode,
            imageData: imageData
        });
    }

    calibrateTarget(position) {
        if (!this.isHost) {
            this.showNotification('❌ Only host can calibrate target', 'error');
            return;
        }
        
        this.socket.emit('calibrate-target', {
            roomCode: this.roomCode,
            position: position
        });
    }

    startMultiplayerGame() {
        if (!this.isHost) {
            this.showNotification('❌ Only host can start the game', 'error');
            return;
        }
        
        this.socket.emit('start-game', {
            roomCode: this.roomCode
        });
    }

    // Player functions
    joinRoom(roomCode, playerName) {
        this.socket.emit('join-room', {
            roomCode: roomCode.toUpperCase(),
            playerName: playerName
        });
    }

    sendPlayerClick(position) {
        if (this.gameState !== 'guessing') return;
        
        this.socket.emit('player-click', {
            roomCode: this.roomCode,
            position: position,
            timestamp: Date.now()
        });
    }

    // UI Update functions
    updateGameState(game) {
        // Update players list
        this.clearPlayersUI();
        game.players.forEach(player => {
            if (player.connected) {
                this.addPlayerToUI(player);
            }
        });
        
        // Update game info
        this.updatePlayerCount(game.players.filter(p => p.connected).length);
        
        // Show/hide host controls
        this.toggleHostControls(this.isHost);
    }

    addPlayerToUI(player) {
        const playersContainer = document.getElementById('players-setup');
        
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-setup';
        playerDiv.dataset.playerId = player.id;
        playerDiv.innerHTML = `
            <h3>
                <span class="player-avatar" style="background: ${this.getPlayerColor(player.id)};">
                    ${player.name.charAt(0).toUpperCase()}
                </span>
                ${player.name}
                ${player.isHost ? '<span class="host-badge">👑 HOST</span>' : ''}
            </h3>
            <div class="player-status">
                <span class="ready-indicator">✅ Ready to play!</span>
                <div class="player-score">Score: <strong>${player.score || 0}</strong></div>
            </div>
        `;
        
        playersContainer.appendChild(playerDiv);
    }

    removePlayerFromUI(playerId) {
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            playerElement.remove();
        }
    }

    clearPlayersUI() {
        document.getElementById('players-setup').innerHTML = '';
    }

    updatePlayerCount(count) {
        document.getElementById('player-count').textContent = count;
    }

    toggleHostControls(isHost) {
        const hostControls = document.querySelectorAll('.host-only');
        hostControls.forEach(control => {
            control.style.display = isHost ? 'block' : 'none';
        });
        
        // Update start button
        const startBtn = document.getElementById('start-game');
        if (isHost) {
            startBtn.style.display = 'flex';
        } else {
            startBtn.style.display = 'none';
        }
    }

    updateImagePreview(imageUrl) {
        const preview = document.getElementById('shared-image-preview');
        preview.innerHTML = `<img src="${imageUrl}" alt="Game Image">`;
        
        // Enable calibration for host
        if (this.isHost) {
            const calibrateBtn = document.getElementById('calibrate-shared-btn');
            calibrateBtn.disabled = false;
        }
    }

    showImagePhase(data) {
        // Switch to question phase
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('question-phase').classList.add('active');
        
        // Update round info
        document.getElementById('question-num').textContent = data.round;
        
        // Show image with target
        const showcase = document.getElementById('face-showcase');
        showcase.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img src="${data.imageUrl}" alt="Game Face" style="max-width: 400px; max-height: 400px; border-radius: 15px; border: 4px solid #FFD700;">
                <div style="position: absolute; left: ${data.targetPosition.x}%; top: ${data.targetPosition.y}%; width: 20px; height: 20px; background: #FF8C00; border: 4px solid white; border-radius: 50%; transform: translate(-50%, -50%); animation: pulse 1s infinite; box-shadow: 0 0 20px rgba(255, 140, 0, 0.8);"></div>
            </div>
        `;
        
        // Start countdown timer
        this.startViewTimer(data.viewTime);
    }

    startViewTimer(duration) {
        let timeLeft = duration / 1000;
        const timerElement = document.getElementById('timer');
        
        const countdown = setInterval(() => {
            timerElement.textContent = Math.ceil(timeLeft);
            timeLeft -= 0.1;
            
            if (timeLeft <= 0) {
                clearInterval(countdown);
            }
        }, 100);
    }

    startGuessingPhase(guessTime) {
        // Switch to game phase
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('game-phase').classList.add('active');
        
        this.gameState = 'guessing';
        
        // Start guess timer
        this.startGuessTimer(guessTime);
        
        // Enable grid clicking
        this.enableGridClicking();
    }

    startGuessTimer(duration) {
        let timeLeft = duration;
        const progressBar = document.getElementById('timer-progress');
        
        const countdown = setInterval(() => {
            const progress = (timeLeft / duration) * 100;
            progressBar.style.width = progress + '%';
            
            // Change color as time runs out
            if (progress > 50) {
                progressBar.style.background = '#32CD32';
            } else if (progress > 25) {
                progressBar.style.background = '#FFA500';
            } else {
                progressBar.style.background = '#FF7F00';
            }
            
            timeLeft -= 100;
            
            if (timeLeft <= 0) {
                clearInterval(countdown);
                this.gameState = 'waiting';
                this.disableGridClicking();
            }
        }, 100);
    }

    enableGridClicking() {
        const gridCells = document.querySelectorAll('.grid-cell');
        gridCells.forEach(cell => {
            cell.addEventListener('click', this.handleGridClick.bind(this));
        });
    }

    disableGridClicking() {
        const gridCells = document.querySelectorAll('.grid-cell');
        gridCells.forEach(cell => {
            cell.removeEventListener('click', this.handleGridClick.bind(this));
        });
    }

    handleGridClick(event) {
        if (this.gameState !== 'guessing') return;
        
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Calculate position as percentage
        const position = {
            x: (col / 16) * 100,
            y: (row / 16) * 100
        };
        
        // Send click to server
        this.sendPlayerClick(position);
        
        // Disable further clicking for this player
        this.gameState = 'waiting';
        this.disableGridClicking();
        
        // Visual feedback
        cell.classList.add('clicked');
        this.showNotification('🎯 Click registered!', 'info');
    }

    handlePlayerScore(data) {
        // Show score notification
        if (data.playerId === this.playerId) {
            this.showNotification(`🎯 You scored ${data.points} points!`, 'success');
        } else {
            this.showNotification(`${data.playerName} scored ${data.points} points!`, 'info');
        }
        
        // Update player score in UI
        this.updatePlayerScore(data.playerId, data.totalScore);
    }

    updatePlayerScore(playerId, score) {
        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            const scoreElement = playerElement.querySelector('.player-score strong');
            if (scoreElement) {
                scoreElement.textContent = score;
            }
        }
    }

    updateLeaderboard(leaderboard) {
        const scoresContainer = document.getElementById('scores');
        
        scoresContainer.innerHTML = leaderboard.map((player, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            
            return `
                <div class="score-item">
                    <span style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2em;">${medal}</span>
                        <span>${player.name}</span>
                    </span>
                    <span style="font-weight: bold; color: #FF8C00;">${player.score} pts</span>
                </div>
            `;
        }).join('');
    }

    showRoundResults(data) {
        // Implementation for round results
        this.showNotification(`Round ${data.round} completed!`, 'info');
        this.updateLeaderboard(data.leaderboard);
    }

    showFinalResults(data) {
        // Switch to final results
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('final-results').classList.add('active');
        
        // Update winner
        this.showNotification(`🏆 ${data.winner.name} wins with ${data.winner.score} points!`, 'success');
        
        // Update podium with real data
        this.updatePodium(data.finalLeaderboard);
    }

    updatePodium(leaderboard) {
        const positions = ['first', 'second', 'third'];
        
        positions.forEach((position, index) => {
            const element = document.getElementById(`${position}-place`);
            if (leaderboard[index]) {
                element.querySelector('.place-name').textContent = leaderboard[index].name;
                element.querySelector('.place-score').textContent = `${leaderboard[index].score} pts`;
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });
    }

    getPlayerColor(playerId) {
        const colors = ['#FF8C00', '#FFD700', '#FFA500', '#FF7F00', '#FFAA00', '#FF9500'];
        const hash = playerId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }

    showNotification(message, type = 'info') {
        // Use existing notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

// Integration with existing game class
class EnhancedFaceGuessingGame extends FaceGuessingGame {
    constructor() {
        super();
        this.multiplayerClient = new MultiplayerGameClient();
        this.isMultiplayer = false;
        
        this.setupMultiplayerUI();
    }

    setupMultiplayerUI() {
        // Add multiplayer toggle
        const lobbyHeader = document.querySelector('.lobby-header');
        const multiplayerToggle = document.createElement('div');
        multiplayerToggle.className = 'multiplayer-toggle';
        multiplayerToggle.innerHTML = `
            <div class="toggle-container">
                <label class="toggle-label">
                    <input type="checkbox" id="multiplayer-mode" />
                    <span class="toggle-slider"></span>
                    <span class="toggle-text">🌐 Multiplayer Mode</span>
                </label>
            </div>
            <div class="room-controls" style="display: none;">
                <input type="text" id="room-code-input" placeholder="Enter Room Code" maxlength="6" />
                <button id="join-room-btn" class="join-room-btn">Join Room</button>
                <button id="create-room-btn" class="create-room-btn">Create Room</button>
            </div>
        `;
        
        lobbyHeader.appendChild(multiplayerToggle);
        
        // Add event listeners
        document.getElementById('multiplayer-mode').addEventListener('change', (e) => {
            this.toggleMultiplayerMode(e.target.checked);
        });
        
        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.createMultiplayerRoom();
        });
        
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.joinMultiplayerRoom();
        });
    }

    toggleMultiplayerMode(enabled) {
        this.isMultiplayer = enabled;
        const roomControls = document.querySelector('.room-controls');
        const singlePlayerControls = document.querySelector('.join-controls');
        
        if (enabled) {
            roomControls.style.display = 'flex';
            singlePlayerControls.style.display = 'none';
        } else {
            roomControls.style.display = 'none';
            singlePlayerControls.style.display = 'flex';
        }
    }

    createMultiplayerRoom() {
        const playerName = prompt('Enter your name:');
        if (playerName) {
            this.multiplayerClient.createRoom(playerName.trim());
        }
    }

    joinMultiplayerRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        const playerName = prompt('Enter your name:');
        
        if (roomCode && playerName) {
            this.multiplayerClient.joinRoom(roomCode, playerName.trim());
        }
    }

    // Override existing methods for multiplayer
    handleSharedImageUpload(event) {
        if (this.isMultiplayer) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.multiplayerClient.uploadGameImage(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            super.handleSharedImageUpload(event);
        }
    }

    confirmCalibration() {
        if (this.isMultiplayer) {
            if (!this.tempForeheadPosition) return;
            this.multiplayerClient.calibrateTarget(this.tempForeheadPosition);
            this.closeCalibrationModal();
        } else {
            super.confirmCalibration();
        }
    }

    startGame() {
        if (this.isMultiplayer) {
            this.multiplayerClient.startMultiplayerGame();
        } else {
            super.startGame();
        }
    }
}

// Replace the existing game initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check if Socket.IO is available
    if (typeof io !== 'undefined') {
        window.game = new EnhancedFaceGuessingGame();
    } else {
        // Fallback to single-player mode
        window.game = new FaceGuessingGame();
        console.warn('Socket.IO not available, running in single-player mode');
    }
});
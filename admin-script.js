// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.gameSettings = {
            viewTime: 5,
            guessTime: 20,
            totalRounds: 10,
            minPlayers: 2
        };
        this.gameImage = null;
        this.targetPosition = null;
        this.players = [];
        this.gameState = 'idle';
        
        this.initializeSocket();
        this.initializeEventListeners();
        this.loadSettings();
    }

    initializeSocket() {
        // Connect to server (automatically detects production URL)
        const serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : window.location.origin;
        this.socket = io(serverUrl);
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.showNotification('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            this.showNotification('Disconnected from server', 'error');
        });

        // Admin-specific events
        this.socket.on('admin-room-created', (data) => {
            this.handleRoomCreated(data);
        });

        this.socket.on('admin-player-joined', (data) => {
            this.handlePlayerJoined(data);
        });

        this.socket.on('admin-player-left', (data) => {
            this.handlePlayerLeft(data);
        });

        this.socket.on('admin-game-started', (data) => {
            this.handleGameStarted(data);
        });

        this.socket.on('admin-round-update', (data) => {
            this.handleRoundUpdate(data);
        });

        this.socket.on('admin-player-scored', (data) => {
            this.handlePlayerScored(data);
        });

        this.socket.on('admin-game-ended', (data) => {
            this.handleGameEnded(data);
        });

        this.socket.on('error', (data) => {
            this.showNotification(data.message, 'error');
        });
    }

    initializeEventListeners() {
        // Room management
        document.getElementById('generate-room-btn').addEventListener('click', () => {
            this.generateRoomId();
        });

        document.getElementById('create-room-btn').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('close-room-btn').addEventListener('click', () => {
            this.closeRoom();
        });

        // Image management
        document.getElementById('upload-zone').addEventListener('click', () => {
            document.getElementById('admin-image-input').click();
        });

        document.getElementById('admin-image-input').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('change-image-btn').addEventListener('click', () => {
            document.getElementById('admin-image-input').click();
        });

        document.getElementById('remove-image-btn').addEventListener('click', () => {
            this.removeImage();
        });

        // Target calibration
        document.getElementById('calibration-image').addEventListener('click', (e) => {
            this.handleTargetCalibration(e);
        });

        // Game settings
        ['view-time', 'guess-time', 'total-rounds', 'min-players'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateSettings();
            });
        });

        // Game controls
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('pause-game-btn').addEventListener('click', () => {
            this.pauseGame();
        });

        document.getElementById('next-round-btn').addEventListener('click', () => {
            this.nextRound();
        });

        document.getElementById('end-game-btn').addEventListener('click', () => {
            this.endGame();
        });
    }

    updateConnectionStatus(connected) {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        if (connected) {
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Disconnected';
        }
    }

    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let roomId = '';
        for (let i = 0; i < 6; i++) {
            roomId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('room-id-input').value = roomId;
    }

    createRoom() {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        
        if (!roomId) {
            this.showNotification('Please enter a Room ID', 'error');
            return;
        }

        if (roomId.length < 4 || roomId.length > 10) {
            this.showNotification('Room ID must be 4-10 characters', 'error');
            return;
        }

        // Send create room request to server
        this.socket.emit('admin-create-room', {
            roomId: roomId,
            settings: this.gameSettings
        });
    }

    closeRoom() {
        if (!this.currentRoom) return;

        this.socket.emit('admin-close-room', {
            roomId: this.currentRoom
        });

        this.currentRoom = null;
        this.updateRoomUI();
        this.showNotification('Room closed', 'info');
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.gameImage = e.target.result;
            this.showImagePreview();
            this.showTargetCalibration();
            this.showNotification('Image uploaded successfully', 'success');
        };
        reader.readAsDataURL(file);
    }

    showImagePreview() {
        document.getElementById('upload-zone').style.display = 'none';
        document.getElementById('image-preview').style.display = 'block';
        document.getElementById('preview-image').src = this.gameImage;
    }

    removeImage() {
        this.gameImage = null;
        this.targetPosition = null;
        document.getElementById('upload-zone').style.display = 'block';
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('target-calibration').style.display = 'none';
        this.showNotification('Image removed', 'info');
    }

    showTargetCalibration() {
        document.getElementById('target-calibration').style.display = 'block';
        document.getElementById('calibration-image').src = this.gameImage;
    }

    handleTargetCalibration(event) {
        const rect = event.target.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        this.targetPosition = { x, y };
        
        const marker = document.getElementById('target-marker');
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.style.display = 'block';
        
        document.getElementById('target-position').textContent = `${x.toFixed(1)}%, ${y.toFixed(1)}%`;
        
        this.showNotification('Target position set', 'success');
    }

    updateSettings() {
        this.gameSettings = {
            viewTime: parseInt(document.getElementById('view-time').value),
            guessTime: parseInt(document.getElementById('guess-time').value),
            totalRounds: parseInt(document.getElementById('total-rounds').value),
            minPlayers: parseInt(document.getElementById('min-players').value)
        };
        
        this.saveSettings();
        this.showNotification('Settings updated', 'success');
    }

    loadSettings() {
        const saved = localStorage.getItem('adminSettings');
        if (saved) {
            this.gameSettings = JSON.parse(saved);
            document.getElementById('view-time').value = this.gameSettings.viewTime;
            document.getElementById('guess-time').value = this.gameSettings.guessTime;
            document.getElementById('total-rounds').value = this.gameSettings.totalRounds;
            document.getElementById('min-players').value = this.gameSettings.minPlayers;
        }
    }

    saveSettings() {
        localStorage.setItem('adminSettings', JSON.stringify(this.gameSettings));
    }

    startGame() {
        if (!this.currentRoom) {
            this.showNotification('No active room', 'error');
            return;
        }

        if (!this.gameImage || !this.targetPosition) {
            this.showNotification('Please upload image and set target position', 'error');
            return;
        }

        if (this.players.length < this.gameSettings.minPlayers) {
            this.showNotification(`Need at least ${this.gameSettings.minPlayers} players`, 'error');
            return;
        }

        this.socket.emit('admin-start-game', {
            roomId: this.currentRoom,
            gameImage: this.gameImage,
            targetPosition: this.targetPosition,
            settings: this.gameSettings
        });
    }

    pauseGame() {
        this.socket.emit('admin-pause-game', {
            roomId: this.currentRoom
        });
    }

    nextRound() {
        this.socket.emit('admin-next-round', {
            roomId: this.currentRoom
        });
    }

    endGame() {
        if (confirm('Are you sure you want to end the game?')) {
            this.socket.emit('admin-end-game', {
                roomId: this.currentRoom
            });
        }
    }

    handleRoomCreated(data) {
        this.currentRoom = data.roomId;
        this.players = [];
        this.updateRoomUI();
        this.showNotification(`Room ${data.roomId} created successfully`, 'success');
    }

    handlePlayerJoined(data) {
        this.players.push(data.player);
        this.updatePlayersUI();
        this.updateRoomUI();
        this.showNotification(`${data.player.name} joined the room`, 'info');
    }

    handlePlayerLeft(data) {
        this.players = this.players.filter(p => p.id !== data.playerId);
        this.updatePlayersUI();
        this.updateRoomUI();
        this.showNotification(`${data.playerName} left the room`, 'info');
    }

    handleGameStarted(data) {
        this.gameState = 'playing';
        this.updateGameControlsUI();
        document.getElementById('game-status-panel').style.display = 'block';
        this.showNotification('Game started!', 'success');
    }

    handleRoundUpdate(data) {
        document.getElementById('current-round').textContent = `${data.round}/${this.gameSettings.totalRounds}`;
        document.getElementById('game-state').textContent = data.state;
        
        if (data.timeRemaining) {
            document.getElementById('time-remaining').textContent = `${data.timeRemaining}s`;
        }
    }

    handlePlayerScored(data) {
        this.updateLeaderboard(data.leaderboard);
        this.showNotification(`${data.playerName} scored ${data.points} points`, 'info');
    }

    handleGameEnded(data) {
        this.gameState = 'ended';
        this.updateGameControlsUI();
        this.updateLeaderboard(data.finalLeaderboard);
        this.showNotification(`Game ended! Winner: ${data.winner?.name || 'No winner'}`, 'success');
    }

    updateRoomUI() {
        const roomInfo = document.getElementById('room-info');
        const createBtn = document.getElementById('create-room-btn');
        const closeBtn = document.getElementById('close-room-btn');
        
        if (this.currentRoom) {
            roomInfo.style.display = 'block';
            document.getElementById('current-room-id').textContent = this.currentRoom;
            document.getElementById('player-count').textContent = this.players.length;
            document.getElementById('room-status').textContent = this.gameState;
            
            createBtn.disabled = true;
            closeBtn.disabled = false;
        } else {
            roomInfo.style.display = 'none';
            createBtn.disabled = false;
            closeBtn.disabled = true;
        }
        
        this.updateGameControlsUI();
    }

    updatePlayersUI() {
        const playersList = document.getElementById('players-list');
        
        if (this.players.length === 0) {
            playersList.innerHTML = '<div class="no-players"><p>No players connected</p></div>';
            return;
        }
        
        playersList.innerHTML = this.players.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                    <span class="player-name">${player.name}</span>
                </div>
                <div class="player-actions">
                    <button class="kick-btn" onclick="admin.kickPlayer('${player.id}')">Kick</button>
                </div>
            </div>
        `).join('');
    }

    updateGameControlsUI() {
        const startBtn = document.getElementById('start-game-btn');
        const pauseBtn = document.getElementById('pause-game-btn');
        const nextBtn = document.getElementById('next-round-btn');
        const endBtn = document.getElementById('end-game-btn');
        
        const hasRoom = !!this.currentRoom;
        const hasImage = !!this.gameImage && !!this.targetPosition;
        const hasPlayers = this.players.length >= this.gameSettings.minPlayers;
        const canStart = hasRoom && hasImage && hasPlayers && this.gameState === 'idle';
        
        startBtn.disabled = !canStart;
        pauseBtn.disabled = this.gameState !== 'playing';
        nextBtn.disabled = this.gameState !== 'playing';
        endBtn.disabled = this.gameState === 'idle';
    }

    updateLeaderboard(leaderboard) {
        const leaderboardEl = document.getElementById('admin-leaderboard');
        
        if (!leaderboard || leaderboard.length === 0) {
            leaderboardEl.innerHTML = '<div class="no-scores"><p>No scores yet</p></div>';
            return;
        }
        
        leaderboardEl.innerHTML = leaderboard.map((player, index) => {
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            
            return `
                <div class="score-item">
                    <div class="score-info">
                        <span class="rank">${rank}</span>
                        <span class="score-name">${player.name}</span>
                    </div>
                    <span class="score-points">${player.score} pts</span>
                </div>
            `;
        }).join('');
    }

    kickPlayer(playerId) {
        if (confirm('Are you sure you want to kick this player?')) {
            this.socket.emit('admin-kick-player', {
                roomId: this.currentRoom,
                playerId: playerId
            });
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }
}

// Initialize admin panel
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new AdminPanel();
});
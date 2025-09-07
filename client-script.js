// Client-side JavaScript for Face Memory Challenge
class ClientGame {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.playerName = null;
        this.playerId = null;
        this.gameState = 'lobby';
        this.players = [];
        this.currentRound = 0;
        this.totalRounds = 10;
        this.gameSettings = {};
        
        this.initializeSocket();
        this.initializeEventListeners();
        this.createGameBoard();
    }

    initializeSocket() {
        // Connect to server (automatically detects production URL)
        const serverUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : window.location.origin;
        this.socket = io(serverUrl);
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.playerId = this.socket.id;
            this.showNotification('🌐 Connected to server!', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showNotification('❌ Connection lost. Reconnecting...', 'error');
        });

        // Client-specific events
        this.socket.on('room-joined', (data) => {
            this.handleRoomJoined(data);
        });

        this.socket.on('player-joined', (data) => {
            this.handlePlayerJoined(data);
        });

        this.socket.on('player-left', (data) => {
            this.handlePlayerLeft(data);
        });

        this.socket.on('game-started', (data) => {
            this.handleGameStarted(data);
        });

        this.socket.on('show-image', (data) => {
            this.showImagePhase(data);
        });

        this.socket.on('hide-image', (data) => {
            this.startGuessingPhase(data);
        });

        this.socket.on('round-ended', (data) => {
            this.handleRoundEnded(data);
        });

        this.socket.on('player-scored', (data) => {
            this.handlePlayerScored(data);
        });

        this.socket.on('leaderboard-update', (data) => {
            this.updateLeaderboard(data.leaderboard);
        });

        this.socket.on('game-ended', (data) => {
            this.handleGameEnded(data);
        });

        this.socket.on('error', (data) => {
            this.showNotification(`❌ ${data.message}`, 'error');
        });
    }

    initializeEventListeners() {
        // Join room button
        document.getElementById('join-room-btn').addEventListener('click', () => {
            this.joinRoom();
        });

        // Enter key for inputs
        document.getElementById('room-id-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    joinRoom() {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name-input').value.trim();
        
        if (!roomId) {
            this.showNotification('Please enter a Room ID', 'error');
            return;
        }
        
        if (!playerName) {
            this.showNotification('Please enter your name', 'error');
            return;
        }

        if (playerName.length < 2 || playerName.length > 20) {
            this.showNotification('Name must be 2-20 characters', 'error');
            return;
        }
        
        this.roomId = roomId;
        this.playerName = playerName;
        
        // Send join request to server
        this.socket.emit('join-room', {
            roomCode: roomId,
            playerName: playerName
        });
    }

    handleRoomJoined(data) {
        this.gameState = 'waiting';
        this.players = data.game.players || [];
        this.gameSettings = data.game.settings || {};
        this.totalRounds = this.gameSettings.totalRounds || 10;
        
        // Hide join form, show waiting room
        document.querySelector('.client-join-section').style.display = 'none';
        document.getElementById('waiting-room').style.display = 'block';
        
        // Update waiting room UI
        document.getElementById('joined-room-id').textContent = this.roomId;
        this.updateWaitingRoom();
        
        this.showNotification(`🎯 Joined room ${this.roomId}!`, 'success');
    }

    handlePlayerJoined(data) {
        if (!this.players.find(p => p.id === data.player.id)) {
            this.players.push(data.player);
        }
        this.updateWaitingRoom();
        this.showNotification(`👋 ${data.player.name} joined!`, 'info');
    }

    handlePlayerLeft(data) {
        this.players = this.players.filter(p => p.id !== data.playerId);
        this.updateWaitingRoom();
        this.showNotification(`👋 ${data.playerName} left`, 'info');
    }

    handleGameStarted(data) {
        this.gameState = 'playing';
        this.currentRound = 0;
        this.gameSettings = data.game.settings || this.gameSettings;
        
        // Hide waiting room
        document.getElementById('setup-phase').classList.remove('active');
        
        this.showNotification('🚀 Game starting!', 'success');
        
        // Show game waiting message
        this.showGameWaitingMessage();
    }

    showGameWaitingMessage() {
        // Create a waiting message for the game phase
        const gamePhase = document.getElementById('game-phase');
        gamePhase.innerHTML = `
            <div class="game-waiting-message">
                <div class="loading-spinner"></div>
                <h2>🎯 Get Ready!</h2>
                <p>The admin is preparing the first round...</p>
            </div>
        `;
        gamePhase.classList.add('active');
    }

    showImagePhase(data) {
        this.currentRound = data.round;
        
        // Switch to question phase
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('question-phase').classList.add('active');
        
        // Update round info
        document.getElementById('question-num').textContent = data.round;
        document.getElementById('total-questions').textContent = this.totalRounds;
        
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
        
        this.showNotification(`📸 Round ${data.round} - Memorize the target!`, 'info');
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

    startGuessingPhase(data) {
        // Switch to game phase
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('game-phase').classList.add('active');
        
        // Update current player info (show that it's your turn)
        document.getElementById('current-player').textContent = this.playerName;
        document.querySelector('.player-action').textContent = 'Click where the target was!';
        
        this.gameState = 'guessing';
        
        // Start guess timer
        this.startGuessTimer(data.guessTime);
        
        // Enable grid clicking
        this.enableGridClicking();
        
        this.showNotification('🎯 Click on the grid where you saw the target!', 'info');
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
            cell.style.cursor = 'pointer';
        });
    }

    disableGridClicking() {
        const gridCells = document.querySelectorAll('.grid-cell');
        gridCells.forEach(cell => {
            cell.removeEventListener('click', this.handleGridClick.bind(this));
            cell.style.cursor = 'default';
        });
    }

    handleGridClick(event) {
        if (this.gameState !== 'guessing') return;
        
        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Calculate position as percentage
        const position = {
            x: (col / 16) * 100 + 3.125, // Add half cell width for center
            y: (row / 16) * 100 + 3.125  // Add half cell height for center
        };
        
        // Send click to server
        this.socket.emit('player-click', {
            roomCode: this.roomId,
            position: position,
            timestamp: Date.now()
        });
        
        // Disable further clicking for this player
        this.gameState = 'waiting';
        this.disableGridClicking();
        
        // Visual feedback
        cell.classList.add('clicked');
        cell.style.background = '#FFD700';
        cell.style.transform = 'scale(1.2)';
        
        this.showNotification('🎯 Click registered! Waiting for other players...', 'info');
    }

    handlePlayerScored(data) {
        // Show score notification
        if (data.playerId === this.playerId) {
            this.showNotification(`🎯 You scored ${data.points} points!`, 'success');
        } else {
            this.showNotification(`${data.playerName} scored ${data.points} points!`, 'info');
        }
    }

    handleRoundEnded(data) {
        this.showNotification(`Round ${data.round} completed!`, 'info');
        this.updateLeaderboard(data.leaderboard);
        
        // Clear grid
        this.clearGameBoard();
        
        // Show waiting message for next round
        if (data.round < this.totalRounds) {
            this.showGameWaitingMessage();
        }
    }

    handleGameEnded(data) {
        this.gameState = 'ended';
        
        // Switch to final results
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('final-results').classList.add('active');
        
        // Update winner
        const winner = data.winner;
        if (winner) {
            this.showNotification(`🏆 ${winner.name} wins with ${winner.score} points!`, 'success');
            
            // Update podium with real data
            this.updatePodium(data.finalLeaderboard);
        }
        
        // Add restart functionality
        document.getElementById('play-again-btn').onclick = () => {
            location.reload(); // Simple restart - rejoin room
        };
        
        document.getElementById('new-game-btn').onclick = () => {
            location.reload(); // Simple restart - new game
        };
    }

    updateWaitingRoom() {
        document.getElementById('waiting-player-count').textContent = this.players.length;
        
        // Update players list
        const playersContainer = document.getElementById('players-setup');
        playersContainer.innerHTML = this.players.map(player => `
            <div class="player-setup">
                <h3>
                    <span class="player-avatar" style="background: ${this.getPlayerColor(player.id)};">
                        ${player.name.charAt(0).toUpperCase()}
                    </span>
                    ${player.name}
                </h3>
                <div class="player-status">
                    <span class="ready-indicator">✅ Ready to play!</span>
                </div>
            </div>
        `).join('');
    }

    updateLeaderboard(leaderboard) {
        const scoresContainer = document.getElementById('scores');
        
        if (!leaderboard || leaderboard.length === 0) {
            scoresContainer.innerHTML = '<div class="no-scores"><p>No scores yet</p></div>';
            return;
        }
        
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

    createGameBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        for (let row = 0; row < 16; row++) {
            for (let col = 0; col < 16; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Determine section (1-4)
                let section;
                if (row < 8 && col < 8) section = 1;
                else if (row < 8 && col >= 8) section = 2;
                else if (row >= 8 && col < 8) section = 3;
                else section = 4;
                
                cell.classList.add(`section-${section}`);
                cell.dataset.section = section;
                
                gameBoard.appendChild(cell);
            }
        }
    }

    clearGameBoard() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('clicked', 'perfect', 'near', 'correct', 'incorrect');
            cell.style.background = '';
            cell.style.transform = '';
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
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Position notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideInRight 0.5s ease;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            max-width: 300px;
            font-family: 'Crimson Text', serif;
        `;
        
        if (type === 'success') notification.style.background = '#32CD32';
        else if (type === 'error') notification.style.background = '#e74c3c';
        else if (type === 'info') notification.style.background = '#FF8C00';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 500);
        }, 3000);
    }
}

// Initialize client game
let clientGame;
document.addEventListener('DOMContentLoaded', () => {
    // Check if Socket.IO is available
    if (typeof io !== 'undefined') {
        clientGame = new ClientGame();
    } else {
        console.error('Socket.IO not available');
        alert('Socket.IO not loaded. Please check your internet connection.');
    }
});
class FaceGuessingGame {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.currentRound = 0;
        this.gameState = 'lobby'; // lobby, question, playing, results, final
        this.currentFacePosition = null;
        this.currentSection = null;
        this.timer = null;
        this.scores = {};
        this.nextPlayerId = 1;
        this.totalQuestions = 10;
        this.questionTimer = 3; // 3 seconds for memorizing
        this.guessTimer = 20; // 10 seconds for guessing
        this.sharedImage = null;
        this.sharedForeheadPosition = null;
        this.sounds = {
            join: document.getElementById('join-sound'),
            correct: document.getElementById('correct-sound'),
            wrong: document.getElementById('wrong-sound')
        };

        this.initializeEventListeners();
        this.createGameBoard();
        this.updatePlayerCount();
        this.createParticles();
    }

    createParticles() {
        const particles = document.getElementById('particles');
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24'][Math.floor(Math.random() * 4)];
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = `float ${Math.random() * 10 + 10}s infinite linear`;
            particle.style.opacity = '0.6';
            particles.appendChild(particle);
        }
    }

    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(() => { }); // Ignore autoplay restrictions
        }
    }

    initializeEventListeners() {
        // Add player button
        document.getElementById('add-player-btn').addEventListener('click', () => this.addPlayer());

        // Enter key for player name input
        document.getElementById('new-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addPlayer();
        });

        // Shared image upload
        document.getElementById('shared-image').addEventListener('change', (e) => this.handleSharedImageUpload(e));
        document.getElementById('shared-image-preview').addEventListener('click', () => {
            document.getElementById('shared-image').click();
        });
        document.getElementById('calibrate-shared-btn').addEventListener('click', () => this.openSharedCalibrationModal());

        // Start game button
        document.getElementById('start-game').addEventListener('click', () => this.startGame());

        // Calibration modal
        document.getElementById('confirm-calibration').addEventListener('click', () => this.confirmCalibration());
        document.getElementById('cancel-calibration').addEventListener('click', () => this.closeCalibrationModal());
        document.getElementById('calibration-image').addEventListener('click', (e) => this.handleCalibrationClick(e));
    }

    addPlayer() {
        const nameInput = document.getElementById('new-player-name');
        const playerName = nameInput.value.trim();

        if (!playerName) {
            this.showNotification('Please enter a player name', 'error');
            return;
        }

        // Check for duplicate names
        if (this.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            this.showNotification('Player name already exists', 'error');
            return;
        }

        const playerId = this.nextPlayerId++;
        const player = {
            id: playerId,
            name: playerName,
            image: null,
            foreheadPosition: null,
            calibrated: false,
            color: this.getPlayerColor(playerId)
        };

        this.players.push(player);
        this.createPlayerSetupElement(player);
        this.playSound('join');
        this.showNotification(`🎯 ${playerName} joined the game! 🎯`, 'success');

        nameInput.value = '';
        this.updatePlayerCount();
        this.updateStartButton();
    }

    getPlayerColor(playerId) {
        const onamColors = ['#FF8C00', '#FFD700', '#FFA500', '#FF7F00', '#FFAA00', '#FF9500', '#FFB84D', '#FF6347'];
        return onamColors[(playerId - 1) % onamColors.length];
    }

    handleSharedImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.sharedImage = e.target.result;

            const preview = document.getElementById('shared-image-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Shared Game Image">`;

            const calibrateBtn = document.getElementById('calibrate-shared-btn');
            calibrateBtn.disabled = false;

            this.sharedForeheadPosition = null; // Reset calibration
            calibrateBtn.textContent = '🎯 Calibrate Target Position';

            this.updateStartButton();
        };
        reader.readAsDataURL(file);
    }

    openSharedCalibrationModal() {
        if (!this.sharedImage) return;

        const modal = document.getElementById('calibration-modal');
        const calibrationImage = document.getElementById('calibration-image');

        calibrationImage.src = this.sharedImage;
        modal.classList.add('active');
        modal.dataset.isShared = 'true';

        // Reset marker
        document.getElementById('forehead-marker').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
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
        `;

        if (type === 'success') notification.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        else if (type === 'error') notification.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
        else notification.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    createPlayerSetupElement(player) {
        const playersContainer = document.getElementById('players-setup');

        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-setup';
        playerDiv.dataset.playerId = player.id;
        playerDiv.style.borderColor = player.color;
        playerDiv.style.animation = 'slideInUp 0.6s ease';

        playerDiv.innerHTML = `
            <h3 style="color: ${player.color}">
                <span class="player-avatar" style="background: ${player.color}; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 1.2em; margin-right: 10px;">${player.name.charAt(0).toUpperCase()}</span>
                ${player.name}
                <button class="remove-player-btn" onclick="game.removePlayer(${player.id})">×</button>
            </h3>
            <div class="player-status">
                <span class="ready-indicator">✅ Ready to play!</span>
            </div>
        `;

        playersContainer.appendChild(playerDiv);
    }

    removePlayer(playerId) {
        this.players = this.players.filter(p => p.id !== playerId);

        const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
        if (playerElement) {
            playerElement.remove();
        }

        this.updatePlayerCount();
        this.updateStartButton();
    }

    updatePlayerCount() {
        document.getElementById('player-count').textContent = this.players.length;
    }

    handleImageUpload(event, playerId) {
        const file = event.target.files[0];
        if (!file) return;

        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
            const preview = playerElement.querySelector('.image-preview');
            const calibrateBtn = playerElement.querySelector('.calibrate-btn');

            preview.innerHTML = `<img src="${e.target.result}" alt="${player.name}">`;
            calibrateBtn.disabled = false;

            // Store image data
            player.image = e.target.result;
            player.calibrated = false; // Reset calibration when new image is uploaded

            // Update UI
            playerElement.classList.remove('calibrated');
            calibrateBtn.textContent = 'Calibrate Forehead';
            calibrateBtn.style.background = '#007bff';

            this.updateStartButton();
        };
        reader.readAsDataURL(file);
    }

    openCalibrationModal(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.image) return;

        const modal = document.getElementById('calibration-modal');
        const calibrationImage = document.getElementById('calibration-image');

        calibrationImage.src = player.image;
        modal.classList.add('active');
        modal.dataset.playerId = playerId;

        // Reset marker
        document.getElementById('forehead-marker').style.display = 'none';
    }

    handleCalibrationClick(event) {
        const rect = event.target.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        const marker = document.getElementById('forehead-marker');
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.style.display = 'block';

        // Store temporary position
        this.tempForeheadPosition = { x, y };
    }

    confirmCalibration() {
        if (!this.tempForeheadPosition) return;

        const modal = document.getElementById('calibration-modal');

        if (modal.dataset.isShared === 'true') {
            // Shared image calibration
            this.sharedForeheadPosition = this.tempForeheadPosition;

            const calibrateBtn = document.getElementById('calibrate-shared-btn');
            calibrateBtn.textContent = '✅ Target Calibrated!';
            calibrateBtn.style.background = 'linear-gradient(135deg, #32CD32, #228B22)';

            // Mark all players as calibrated since they share the same image
            this.players.forEach(player => {
                player.calibrated = true;
                const playerElement = document.querySelector(`[data-player-id="${player.id}"]`);
                if (playerElement) {
                    playerElement.classList.add('calibrated');
                }
            });
        } else {
            // Individual player calibration (legacy code, shouldn't be used now)
            const playerId = parseInt(modal.dataset.playerId);
            const player = this.players.find(p => p.id === playerId);

            if (player) {
                player.foreheadPosition = this.tempForeheadPosition;
                player.calibrated = true;

                const playerElement = document.querySelector(`[data-player-id="${playerId}"]`);
                if (playerElement) {
                    playerElement.classList.add('calibrated');
                }
            }
        }

        this.closeCalibrationModal();
        this.updateStartButton();
    }

    closeCalibrationModal() {
        document.getElementById('calibration-modal').classList.remove('active');
        this.tempForeheadPosition = null;
    }

    updateStartButton() {
        const startBtn = document.getElementById('start-game');
        const btnText = startBtn.querySelector('.btn-text');
        const btnRequirement = startBtn.querySelector('.btn-requirement');
        const hasImage = this.sharedImage !== null;
        const hasCalibration = this.sharedForeheadPosition !== null;
        const hasPlayers = this.players.length >= 2;
        const canStart = hasImage && hasCalibration && hasPlayers;

        startBtn.disabled = !canStart;

        if (canStart) {
            btnText.textContent = `START GAME`;
            btnRequirement.textContent = `${this.players.length} players ready!`;
            startBtn.style.background = 'linear-gradient(135deg, #32CD32, #228B22)';
            startBtn.style.animation = 'pulse 2s infinite';
        } else {
            btnText.textContent = 'START GAME';
            if (!hasImage) {
                btnRequirement.textContent = 'Upload image first';
            } else if (!hasCalibration) {
                btnRequirement.textContent = 'Calibrate target first';
            } else {
                btnRequirement.textContent = `Need ${2 - this.players.length} more players`;
            }
            startBtn.style.background = '#95a5a6';
            startBtn.style.animation = 'none';
        }
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

                cell.addEventListener('click', () => this.handleGridClick(row, col, section));
                gameBoard.appendChild(cell);
            }
        }
    }

    startGame() {
        if (!this.sharedImage || !this.sharedForeheadPosition) {
            this.showNotification('Please upload and calibrate the image first!', 'error');
            return;
        }

        if (this.players.length < 2) {
            this.showNotification('Need at least 2 players to start!', 'error');
            return;
        }

        this.gameState = 'question';
        this.currentPlayerIndex = 0;
        this.currentRound = 0;

        // Initialize scores
        this.players.forEach(player => {
            this.scores[player.id] = 0;
        });

        // Switch to question phase with animation
        document.getElementById('setup-phase').classList.remove('active');
        this.showNotification('🚀 Game Starting! 🚀', 'success');

        setTimeout(() => {
            this.startQuestionPhase();
        }, 1000);
    }

    startQuestionPhase() {
        if (this.currentRound >= this.totalQuestions) {
            this.showFinalResults();
            return;
        }

        this.gameState = 'question';

        // Show question phase
        document.getElementById('question-phase').classList.add('active');
        document.getElementById('question-num').textContent = this.currentRound + 1;
        document.getElementById('total-questions').textContent = this.totalQuestions;
        document.getElementById('question-text').textContent = `Memorize the face and target position!`;

        // Show face in showcase
        this.showFaceInShowcase();

        // Start question timer
        this.startQuestionTimer();
    }

    showFaceInShowcase() {
        const showcase = document.getElementById('face-showcase');
        showcase.innerHTML = `
            <div style="position: relative; display: inline-block;">
                <img src="${this.sharedImage}" alt="Game Face" style="max-width: 300px; max-height: 300px; border-radius: 15px; box-shadow: 0 10px 30px rgba(255,140,0,0.3); border: 3px solid #FFD700;">
                <div style="position: absolute; left: ${this.sharedForeheadPosition.x}%; top: ${this.sharedForeheadPosition.y}%; width: 15px; height: 15px; background: #FF8C00; border: 3px solid white; border-radius: 50%; transform: translate(-50%, -50%); animation: pulse 1s infinite;"></div>
            </div>
        `;
    }

    startQuestionTimer() {
        let timeLeft = this.questionTimer;
        const timerElement = document.getElementById('timer');
        const timerCircle = document.querySelector('.timer-circle');

        timerElement.textContent = timeLeft;

        this.timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            // Update circle progress
            const progress = ((this.questionTimer - timeLeft) / this.questionTimer) * 360;
            timerCircle.style.background = `conic-gradient(#ff6b6b ${progress}deg, #f1f2f6 ${progress}deg)`;

            if (timeLeft <= 0) {
                clearInterval(this.timer);
                this.startGamePhase();
            }
        }, 1000);
    }

    startGamePhase() {
        this.gameState = 'playing';
        const currentPlayer = this.players[this.currentRound % this.players.length];

        // Hide question phase, show game phase
        document.getElementById('question-phase').classList.remove('active');
        document.getElementById('game-phase').classList.add('active');

        // Update UI
        document.getElementById('current-player').textContent = currentPlayer.name;

        // Clear previous round
        this.clearGameBoard();
        this.updateLeaderboard();

        // Position face randomly and start guessing timer
        this.positionFaceForGuessing();
        this.startGuessingTimer();
    }

    positionFaceForGuessing() {
        // Choose random section (1-4)
        this.currentSection = Math.floor(Math.random() * 4) + 1;

        // Choose random position within that section
        const sectionStartRow = this.currentSection <= 2 ? 0 : 8;
        const sectionStartCol = (this.currentSection === 1 || this.currentSection === 3) ? 0 : 8;

        const randomRow = sectionStartRow + Math.floor(Math.random() * 6) + 1;
        const randomCol = sectionStartCol + Math.floor(Math.random() * 6) + 1;

        this.currentFacePosition = { row: randomRow, col: randomCol };

        // Calculate forehead position in grid coordinates using shared image
        const cellSize = 640 / 16;
        const foreheadGridX = randomCol * cellSize + (this.sharedForeheadPosition.x / 100) * cellSize;
        const foreheadGridY = randomRow * cellSize + (this.sharedForeheadPosition.y / 100) * cellSize;

        this.currentForeheadPosition = { x: foreheadGridX, y: foreheadGridY };
    }

    startGuessingTimer() {
        let timeLeft = this.guessTimer;
        const progressBar = document.getElementById('timer-progress');

        progressBar.style.width = '100%';

        this.timer = setInterval(() => {
            timeLeft--;
            const progress = (timeLeft / this.guessTimer) * 100;
            progressBar.style.width = progress + '%';

            // Change color as time runs out
            if (progress > 50) {
                progressBar.style.background = '#32CD32';
            } else if (progress > 25) {
                progressBar.style.background = '#FFA500';
            } else {
                progressBar.style.background = '#FF7F00';
            }

            if (timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleTimeUp();
            }
        }, 100);
    }

    handleTimeUp() {
        this.gameState = 'results';
        this.showResults(null, null, 0, false, true); // Time up
    }

    showFaceInRandomSection(player) {
        // Choose random section (1-4)
        this.currentSection = Math.floor(Math.random() * 4) + 1;

        // Choose random position within that section
        const sectionStartRow = this.currentSection <= 2 ? 0 : 8;
        const sectionStartCol = (this.currentSection === 1 || this.currentSection === 3) ? 0 : 8;

        const randomRow = sectionStartRow + Math.floor(Math.random() * 6) + 1; // Leave 1 cell margin
        const randomCol = sectionStartCol + Math.floor(Math.random() * 6) + 1;

        this.currentFacePosition = { row: randomRow, col: randomCol };

        // Calculate forehead position in grid coordinates
        const foreheadGridX = randomCol * 40 + (player.foreheadPosition.x / 100) * 200;
        const foreheadGridY = randomRow * 40 + (player.foreheadPosition.y / 100) * 200;

        this.currentForeheadPosition = { x: foreheadGridX, y: foreheadGridY };

        // Show face
        this.displayFaceInGrid(player, randomRow, randomCol);

        // Start timer
        this.startTimer(3, () => {
            this.hideFace();
            this.enableGuessing();
        });
    }

    displayFaceInGrid(player, row, col) {
        const faceDisplay = document.getElementById('face-display');
        faceDisplay.innerHTML = '';

        const faceImg = document.createElement('img');
        faceImg.src = player.image;
        faceImg.className = 'face-in-grid';
        faceImg.style.left = `${col * 40 + 10}px`;
        faceImg.style.top = `${row * 40 + 10}px`;

        faceDisplay.appendChild(faceImg);
    }

    hideFace() {
        document.getElementById('face-display').innerHTML = '';
    }

    startTimer(seconds, callback) {
        const timerElement = document.getElementById('timer');
        let timeLeft = seconds;

        timerElement.textContent = timeLeft;

        this.timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(this.timer);
                callback();
            }
        }, 1000);
    }

    enableGuessing() {
        this.gameState = 'guessing';
        // Grid cells are already clickable
    }

    handleGridClick(row, col, section) {
        if (this.gameState !== 'playing') return;

        clearInterval(this.timer);
        this.gameState = 'results';

        // Check if click is outside the 16x16 matrix
        if (row < 0 || row >= 16 || col < 0 || col >= 16) {
            // Outside matrix - minus marks
            const currentPlayer = this.players[this.currentRound % this.players.length];
            this.scores[currentPlayer.id] -= 25;
            this.showResults(row, col, -25, false, false, 0, 'outside_matrix');
            return;
        }

        // Calculate actual forehead cell position
        const actualRow = this.currentFacePosition.row;
        const actualCol = this.currentFacePosition.col;

        let points = 0;
        let resultType = '';

        // Check exact position (100 marks)
        if (row === actualRow && col === actualCol) {
            points = 100;
            resultType = 'exact';
        }
        // Check adjacent cells (50 marks)
        else if (Math.abs(row - actualRow) <= 1 && Math.abs(col - actualCol) <= 1) {
            points = 50;
            resultType = 'near';
        }
        // Check if in same section but wrong position (0 marks)
        else if (this.isInSameSection(row, col, actualRow, actualCol)) {
            points = 0;
            resultType = 'wrong_section';
        }
        // Outside the section but inside matrix (minus marks)
        else {
            points = -10;
            resultType = 'outside_section';
        }

        // Update score
        const currentPlayer = this.players[this.currentRound % this.players.length];
        this.scores[currentPlayer.id] += points;

        this.showResults(row, col, points, points === 100, false, points / 100, resultType);
    }

    isInSameSection(clickRow, clickCol, actualRow, actualCol) {
        const getSection = (row, col) => {
            if (row < 8 && col < 8) return 1;
            else if (row < 8 && col >= 8) return 2;
            else if (row >= 8 && col < 8) return 3;
            else return 4;
        };

        return getSection(clickRow, clickCol) === getSection(actualRow, actualCol);
    }

    showResults(clickedRow, clickedCol, points, isCorrect, timeUp, accuracy = 0, resultType = '') {
        const currentPlayer = this.players[this.currentRound % this.players.length];

        // Hide game phase, show results
        document.getElementById('game-phase').classList.remove('active');
        document.getElementById('results-phase').classList.add('active');

        // Update results UI
        const resultHeader = document.getElementById('result-header');
        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const pointsEarned = document.getElementById('points-earned');
        const accuracyPercent = document.getElementById('accuracy-percent');

        if (timeUp) {
            resultIcon.textContent = '⏰';
            resultTitle.textContent = 'സമയം കഴിഞ്ഞു! Time\'s Up!';
            pointsEarned.textContent = '0 points';
            accuracyPercent.textContent = '0%';
            resultHeader.style.background = '#95a5a6';
            this.playSound('wrong');
        } else {
            // Handle different result types
            switch (resultType) {
                case 'exact':
                    resultIcon.textContent = '🎯';
                    resultTitle.textContent = 'പെർഫെക്റ്റ്! Perfect Shot!';
                    pointsEarned.textContent = `+${points} points`;
                    accuracyPercent.textContent = '100%';
                    resultHeader.style.background = '#FFD700';
                    this.playSound('correct');
                    break;

                case 'near':
                    resultIcon.textContent = '🌟';
                    resultTitle.textContent = 'നല്ലത്! Close Shot!';
                    pointsEarned.textContent = `+${points} points`;
                    accuracyPercent.textContent = '50%';
                    resultHeader.style.background = '#FFA500';
                    this.playSound('correct');
                    break;

                case 'wrong_section':
                    resultIcon.textContent = '❌';
                    resultTitle.textContent = 'തെറ്റായ സ്ഥാനം! Wrong Position!';
                    pointsEarned.textContent = `${points} points`;
                    accuracyPercent.textContent = '0%';
                    resultHeader.style.background = '#FFA500';
                    this.playSound('wrong');
                    break;

                case 'outside_section':
                    resultIcon.textContent = '⚠️';
                    resultTitle.textContent = 'വളരെ ദൂരെ! Too Far!';
                    pointsEarned.textContent = `${points} points`;
                    accuracyPercent.textContent = '0%';
                    resultHeader.style.background = '#FF7F00';
                    this.playSound('wrong');
                    break;

                case 'outside_matrix':
                    resultIcon.textContent = '🚫';
                    resultTitle.textContent = 'മാട്രിക്സിന് പുറത്ത്! Outside Matrix!';
                    pointsEarned.textContent = `${points} points`;
                    accuracyPercent.textContent = '0%';
                    resultHeader.style.background = '#FF8C00';
                    this.playSound('wrong');
                    break;

                default:
                    resultIcon.textContent = '🎯';
                    resultTitle.textContent = 'നല്ല ശ്രമം! Good Try!';
                    pointsEarned.textContent = `${points >= 0 ? '+' : ''}${points} points`;
                    accuracyPercent.textContent = Math.round(accuracy * 100) + '%';
                    resultHeader.style.background = '#FFA500';
                    this.playSound('wrong');
            }

            // Highlight clicked cell
            if (clickedRow !== null && clickedCol !== null) {
                const clickedCell = document.querySelector(`[data-row="${clickedRow}"][data-col="${clickedCol}"]`);
                if (clickedCell) {
                    if (points === 100) {
                        clickedCell.classList.add('perfect');
                    } else if (points === 50) {
                        clickedCell.classList.add('near');
                    } else if (points <= 0) {
                        clickedCell.classList.add('incorrect');
                    }
                }
            }
        }

        // Show correct answer
        this.showCorrectAnswer();

        // Update leaderboard
        this.updateLeaderboard();

        // Start next question timer
        this.startNextQuestionTimer();
    }

    showCorrectAnswer() {
        const answerBoard = document.getElementById('answer-board');

        answerBoard.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; background: #FFF8DC; border-radius: 10px; overflow: hidden; border: 2px solid #FFD700;">
                <img src="${this.sharedImage}" alt="Game Face" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; left: ${this.currentFacePosition.col * 10 + (this.sharedForeheadPosition.x / 100) * 10}px; top: ${this.currentFacePosition.row * 10 + (this.sharedForeheadPosition.y / 100) * 10}px; width: 8px; height: 8px; background: #FF8C00; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); animation: pulse 1s infinite;"></div>
            </div>
        `;
    }

    startNextQuestionTimer() {
        let timeLeft = 3;
        const nextTimer = document.getElementById('next-timer');

        const countdown = setInterval(() => {
            nextTimer.textContent = timeLeft;
            timeLeft--;

            if (timeLeft < 0) {
                clearInterval(countdown);
                this.nextQuestion();
            }
        }, 1000);
    }

    nextQuestion() {
        document.getElementById('results-phase').classList.remove('active');
        this.currentRound++;
        this.clearGameBoard();

        setTimeout(() => {
            this.startQuestionPhase();
        }, 500);
    }

    clearGameBoard() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('perfect', 'near', 'correct', 'incorrect');
        });
        document.getElementById('face-display').innerHTML = '';
    }

    updateLeaderboard() {
        const scoresContainer = document.getElementById('scores');
        const sortedPlayers = [...this.players].sort((a, b) => this.scores[b.id] - this.scores[a.id]);

        scoresContainer.innerHTML = sortedPlayers.map((player, index) => {
            const position = index + 1;
            const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;

            return `<div class="score-item" style="border-left-color: ${player.color};">
                <span style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.2em;">${medal}</span>
                    <span style="width: 25px; height: 25px; background: ${player.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.8em; font-weight: bold;">${player.name.charAt(0).toUpperCase()}</span>
                    <span>${player.name}</span>
                </span>
                <span style="font-weight: bold; color: ${player.color};">${this.scores[player.id]} pts</span>
            </div>`;
        }).join('');
    }

    showFinalResults() {
        this.gameState = 'final';

        // Hide all other phases
        document.querySelectorAll('.phase').forEach(phase => phase.classList.remove('active'));
        document.getElementById('final-results').classList.add('active');

        // Sort players by score
        const sortedPlayers = [...this.players].sort((a, b) => this.scores[b.id] - this.scores[a.id]);

        // Update podium
        const firstPlace = document.getElementById('first-place');
        const secondPlace = document.getElementById('second-place');
        const thirdPlace = document.getElementById('third-place');

        if (sortedPlayers[0]) {
            firstPlace.querySelector('.place-name').textContent = sortedPlayers[0].name;
            firstPlace.querySelector('.place-score').textContent = this.scores[sortedPlayers[0].id] + ' pts';
            firstPlace.style.background = '#FFFFFF';
            firstPlace.style.borderColor = sortedPlayers[0].color;
        }

        if (sortedPlayers[1]) {
            secondPlace.querySelector('.place-name').textContent = sortedPlayers[1].name;
            secondPlace.querySelector('.place-score').textContent = this.scores[sortedPlayers[1].id] + ' pts';
            secondPlace.style.background = '#FFFFFF';
            secondPlace.style.borderColor = sortedPlayers[1].color;
        }

        if (sortedPlayers[2]) {
            thirdPlace.querySelector('.place-name').textContent = sortedPlayers[2].name;
            thirdPlace.querySelector('.place-score').textContent = this.scores[sortedPlayers[2].id] + ' pts';
            thirdPlace.style.background = '#FFFFFF';
            thirdPlace.style.borderColor = sortedPlayers[2].color;
        }

        // Add event listeners for final buttons
        document.getElementById('play-again-btn').onclick = () => this.playAgain();
        document.getElementById('new-game-btn').onclick = () => this.newGame();

        this.showNotification(`🏆 ${sortedPlayers[0].name} ഓണം ചാമ്പ്യൻ! ${this.scores[sortedPlayers[0].id]} പോയിന്റ്സ്! 🏆`, 'success');
    }

    playAgain() {
        // Reset scores but keep players
        this.players.forEach(player => {
            this.scores[player.id] = 0;
        });

        this.currentRound = 0;
        this.gameState = 'question';

        // Hide final results
        document.getElementById('final-results').classList.remove('active');

        this.showNotification('🔄 പുതിയ ഓണാഘോഷം! New Onam Game!', 'success');
        setTimeout(() => {
            this.startQuestionPhase();
        }, 1000);
    }

    newGame() {
        // Reset everything
        this.players = [];
        this.scores = {};
        this.currentRound = 0;
        this.nextPlayerId = 1;
        this.gameState = 'lobby';

        // Clear players container
        document.getElementById('players-setup').innerHTML = '';

        // Show setup phase
        document.getElementById('final-results').classList.remove('active');
        document.getElementById('setup-phase').classList.add('active');

        this.updatePlayerCount();
        this.updateStartButton();
        this.showNotification('🆕 പുതിയ ഓണാഘോഷം സൃഷ്ടിച്ചു! New Onam Celebration!', 'success');
    }
}

// Initialize the game when the page loads
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new FaceGuessingGame();
});
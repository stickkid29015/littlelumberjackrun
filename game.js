class LumberjackGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.levelElement = document.getElementById('level');
        this.statusElement = document.getElementById('gameStatus');
        this.restartBtn = document.getElementById('restartBtn');
        this.fullResetBtn = document.getElementById('fullResetBtn');
        this.musicToggle = document.getElementById('musicToggle');
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.timerElement = document.getElementById('timer');
        
        // Music state
        this.musicPlaying = true;
        this.backgroundMusic.volume = 0.3; // Set volume to 30%
        
        // Check if music file exists
        this.backgroundMusic.addEventListener('loadstart', () => {
            console.log('Music loading started...');
        });
        
        this.backgroundMusic.addEventListener('canplay', () => {
            console.log('Music ready to play!');
        });
        
        this.backgroundMusic.addEventListener('error', (e) => {
            console.error('Music loading error:', e);
            console.log('Make sure background-music.mp3 is in the same folder as your game files');
        });
        
        // Game dimensions
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameRunning = false;
        this.gameStarted = false;
        this.score = 0;
        this.level = 1;
        this.checkpointLevel = 1;
        this.checkpointScore = 0;
        
        // Timer system
        this.timerStartTime = null;
        this.timerRunning = false;
        this.finalTime = null;
        
        // Player properties
        this.player = {
            x: 30,
            y: this.height - 160,
            width: 20,
            height: 30,
            velocityY: 0,
            onGround: false,
            onLog: false,
            speed: 3,
            jumpPower: 12,
            gravity: 0.5
        };
        
        // River and ground setup
        this.riverTop = this.height - 120;
        this.riverBottom = this.height - 40;
        this.groundHeight = 40;
        
        // Logs array
        this.logs = [];
        this.logSpawnTimer = 0;
        this.logSpawnInterval = 120; // frames between log spawns (increased for easier start)
        
        // Alligators array (spawns starting level 3)
        this.alligators = [];
        this.alligatorSpawnTimer = 0;
        this.alligatorSpawnInterval = 180; // frames between alligator spawns
        
        // Particle system for water effects
        this.particles = [];
        
        // Flag properties
        this.flag = {
            x: this.width - 60,
            y: this.riverTop - 40,
            width: 20,
            height: 30
        };
        
        // Island properties (safe spot in middle of river)
        this.island = {
            x: this.width / 2 - 40,
            y: this.riverTop - 10,
            width: 80,
            height: 20
        };
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            // Prevent keyboard events from triggering buttons
            if (e.target.tagName === 'BUTTON') {
                return;
            }
            
            this.keys[e.code] = true;
            
            // Start game on any key press if not started
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.gameRunning = true;
                this.startTimer(); // Start timer when game begins
                this.startMusic(); // Start music when game begins
            }
            
            // Debug: Press 5 to jump to level 3
            if (e.code === 'Digit5' && this.gameRunning) {
                this.level = 3;
                this.score = 200; // Give some score for reaching level 3
                this.checkpointLevel = 3;
                this.checkpointScore = this.score;
                this.updateScore();
                this.statusElement.textContent = 'Jumped to Level 3!';
                this.statusElement.className = 'win';
                
                // Clear entities
                this.logs = [];
                this.alligators = [];
                this.logSpawnTimer = 0;
                this.alligatorSpawnTimer = 0;
                
                // Reset player position
                this.player.x = 30;
                this.player.y = this.height - 160;
                this.player.velocityY = 0;
                this.player.onGround = false;
                this.player.onLog = false;
                
                // Clear status after 2 seconds
                setTimeout(() => {
                    if (this.gameRunning) {
                        this.statusElement.textContent = '';
                        this.statusElement.className = '';
                    }
                }, 2000);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Restart button
        this.restartBtn.addEventListener('click', () => {
            this.restart();
        });
        
        // Full reset button
        this.fullResetBtn.addEventListener('click', () => {
            this.fullReset();
        });
        
        // Music toggle button (prevent keyboard events from triggering it)
        this.musicToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMusic();
        });
        
        this.musicToggle.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        
        // Load music file
        this.backgroundMusic.load();
        console.log('Music file path:', this.backgroundMusic.src || 'background-music.mp3');
        
        // Try to start music when game starts
        this.startMusic();
    }
    
    createLog() {
        // Scale difficulty with level (start easier on level 1)
        let baseSpeed, maxSpeed, logWidth;
        
        if (this.level === 1) {
            // Level 1: moderate speed logs, bigger logs
            baseSpeed = 0.8;
            maxSpeed = 1.8;
            logWidth = Math.random() * 80 + 60; // Bigger logs (60-140)
        } else {
            // Level 2+: normal scaling
            baseSpeed = 1 + (this.level - 2) * 0.3;
            maxSpeed = baseSpeed + 2;
            logWidth = Math.random() * 60 + 40; // Normal size (40-100)
        }
        
        const logHeight = 15;
        const speed = Math.random() * (maxSpeed - baseSpeed) + baseSpeed;
        
        // Create logs floating on the water surface
        const possibleY = [
            this.riverTop - 10,
            this.riverTop - 5,
            this.riverTop
        ];
        
        return {
            x: this.width,
            y: possibleY[Math.floor(Math.random() * possibleY.length)],
            width: logWidth,
            height: logHeight,
            speed: speed,
            color: '#8B4513'
        };
    }
    
    createAlligator() {
        // Alligators only spawn from level 3 onwards
        if (this.level < 3) return null;
        
        // Scale speed with level
        const baseSpeed = 0.5 + (this.level - 3) * 0.2;
        const maxSpeed = baseSpeed + 1;
        const speed = Math.random() * (maxSpeed - baseSpeed) + baseSpeed;
        
        const alligatorWidth = 40;
        const alligatorHeight = 12;
        
        // Spawn alligators at the top of the water column
        const possibleY = [
            this.riverTop - 5,
            this.riverTop,
            this.riverTop + 5
        ];
        
        return {
            x: this.width,
            y: possibleY[Math.floor(Math.random() * possibleY.length)],
            width: alligatorWidth,
            height: alligatorHeight,
            speed: speed,
            color: '#2F4F2F' // Dark green
        };
    }
    
    createWaterSplash(x, y, intensity = 1) {
        const particleCount = 1 + Math.floor(Math.random() * 2) * intensity; // Fewer particles
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: x + Math.random() * 10 - 5,
                y: y + Math.random() * 5 - 2,
                velocityX: (Math.random() - 0.5) * 1 * intensity, // Slower movement
                velocityY: -Math.random() * 1.5 * intensity, // Less dramatic jumps
                life: 20 + Math.random() * 15, // Shorter life
                maxLife: 20 + Math.random() * 15,
                size: 1 + Math.random() * 1, // Smaller particles
                type: 'splash',
                color: `rgba(135, 206, 235, ${0.3 + Math.random() * 0.2})` // More transparent
            });
        }
    }
    
    createRipple(x, y) {
        this.particles.push({
            x: x,
            y: y,
            radius: 1,
            maxRadius: 8 + Math.random() * 5, // Smaller ripples
            life: 30, // Shorter duration
            maxLife: 30,
            type: 'ripple',
            alpha: 0.4 // Much more transparent
        });
    }
    
    updatePlayer() {
        if (!this.gameRunning) return;
        
        // Horizontal movement
        if (this.keys['ArrowLeft'] && this.player.x > 0) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] && this.player.x < this.width - this.player.width) {
            this.player.x += this.player.speed;
        }
        
        // Jumping
        if (this.keys['Space'] && (this.player.onGround || this.player.onLog)) {
            this.player.velocityY = -this.player.jumpPower;
            this.player.onGround = false;
            this.player.onLog = false;
        }
        
        // Apply gravity
        this.player.velocityY += this.player.gravity;
        this.player.y += this.player.velocityY;
        
        // Ground collision (starting platform)
        if (this.player.x < 80 && this.player.y >= this.riverTop - this.player.height) {
            this.player.y = this.riverTop - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Ground collision (ending platform)
        if (this.player.x > this.width - 80 && this.player.y >= this.riverTop - this.player.height) {
            this.player.y = this.riverTop - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Island collision (safe spot)
        if (this.player.x + this.player.width > this.island.x &&
            this.player.x < this.island.x + this.island.width &&
            this.player.y + this.player.height >= this.island.y &&
            this.player.y + this.player.height <= this.island.y + this.island.height + 8) {
            this.player.y = this.island.y - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Ground collision (bottom ground)
        if (this.player.y >= this.height - this.groundHeight - this.player.height) {
            this.player.y = this.height - this.groundHeight - this.player.height;
            this.player.velocityY = 0;
            this.player.onGround = true;
        }
        
        // Reset onLog status (will be set again if on a log)
        this.player.onLog = false;
    }
    
    updateLogs() {
        if (!this.gameRunning) return;
        
        // Move logs
        for (let i = this.logs.length - 1; i >= 0; i--) {
            this.logs[i].x -= this.logs[i].speed;
            
            // Create splash particles for logs moving through water
            if (Math.random() < 0.1) { // 10% chance each frame
                const log = this.logs[i];
                this.createWaterSplash(
                    log.x + log.width - 5, // Back of the log
                    log.y + log.height + 2, // Just below the log
                    0.5 // Light intensity
                );
            }
            
            // Remove logs that are off screen
            if (this.logs[i].x + this.logs[i].width < 0) {
                this.logs.splice(i, 1);
            }
        }
        
        // Spawn new logs with level-based frequency
        this.logSpawnTimer++;
        let adjustedInterval;
        
        if (this.level === 1) {
            // Level 1: spawn logs less frequently (more challenging)
            adjustedInterval = 110;
        } else {
            // Level 2+: normal difficulty scaling
            adjustedInterval = Math.max(50, this.logSpawnInterval - (this.level - 2) * 5);
        }
        
        if (this.logSpawnTimer >= adjustedInterval) {
            this.logs.push(this.createLog());
            this.logSpawnTimer = 0;
        }
    }
    
    updateAlligators() {
        if (!this.gameRunning) return;
        
        // Move alligators
        for (let i = this.alligators.length - 1; i >= 0; i--) {
            this.alligators[i].x -= this.alligators[i].speed;
            
            // Create ripple effects for alligators swimming
            if (Math.random() < 0.08) { // 8% chance each frame
                const alligator = this.alligators[i];
                this.createRipple(
                    alligator.x + alligator.width / 2,
                    alligator.y + alligator.height + 3
                );
                
                // Occasionally create a small splash too
                if (Math.random() < 0.05) {
                    this.createWaterSplash(
                        alligator.x + alligator.width - 10,
                        alligator.y + alligator.height,
                        0.3
                    );
                }
            }
            
            // Remove alligators that are off screen
            if (this.alligators[i].x + this.alligators[i].width < 0) {
                this.alligators.splice(i, 1);
            }
        }
        
        // Spawn new alligators starting from level 3
        if (this.level >= 3) {
            this.alligatorSpawnTimer++;
            let adjustedInterval = Math.max(120, this.alligatorSpawnInterval - (this.level - 3) * 15);
            
            if (this.alligatorSpawnTimer >= adjustedInterval) {
                const alligator = this.createAlligator();
                if (alligator) {
                    this.alligators.push(alligator);
                }
                this.alligatorSpawnTimer = 0;
            }
        }
    }
    
    updateParticles() {
        if (!this.gameRunning) return;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.life--;
            
            if (particle.type === 'splash') {
                // Update splash particles
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
                particle.velocityY += 0.1; // Gravity
                particle.velocityX *= 0.98; // Air resistance
                
            } else if (particle.type === 'ripple') {
                // Update ripple particles
                particle.radius += (particle.maxRadius - particle.radius) * 0.1;
                particle.alpha = particle.life / particle.maxLife * 0.8;
            }
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        if (!this.gameRunning) return;
        
        // Check alligator collisions first (deadly)
        for (let alligator of this.alligators) {
            if (this.player.x < alligator.x + alligator.width &&
                this.player.x + this.player.width > alligator.x &&
                this.player.y < alligator.y + alligator.height &&
                this.player.y + this.player.height > alligator.y) {
                
                // Player touched an alligator - game over!
                this.gameOver(false);
                return;
            }
        }
        
        // Check if player is on any log first
        let onAnyLog = false;
        for (let log of this.logs) {
            if (this.player.x < log.x + log.width &&
                this.player.x + this.player.width > log.x &&
                this.player.y + this.player.height <= log.y + log.height + 8 &&
                this.player.y + this.player.height >= log.y - 5) {
                
                // Player is on log
                this.player.y = log.y - this.player.height;
                this.player.velocityY = 0;
                this.player.onLog = true;
                onAnyLog = true;
                
                // Move player with the log
                this.player.x -= log.speed;
                
                // Prevent player from going off screen when on log
                if (this.player.x < 0) {
                    this.player.x = 0;
                }
                
                break;
            }
        }
        
        // Check if player is on island
        let onIsland = false;
        if (this.player.x + this.player.width > this.island.x &&
            this.player.x < this.island.x + this.island.width &&
            this.player.y + this.player.height >= this.island.y &&
            this.player.y + this.player.height <= this.island.y + this.island.height + 5) {
            onIsland = true;
        }
        
        // Check if player is in water (lose condition)
        if (this.player.y + this.player.height > this.riverTop && 
            this.player.y < this.riverBottom && 
            this.player.x >= 80 && 
            this.player.x <= this.width - 80 &&
            !onAnyLog && !onIsland) {
            
            this.gameOver(false);
        }
        
        // Check if player reached the flag
        if (this.player.x + this.player.width >= this.flag.x &&
            this.player.x <= this.flag.x + this.flag.width &&
            this.player.y + this.player.height >= this.flag.y &&
            this.player.y <= this.flag.y + this.flag.height) {
            this.nextLevel();
        }
        
        // Check if player fell off the bottom
        if (this.player.y > this.height) {
            this.gameOver(false);
        }
    }
    
    nextLevel() {
        this.level++;
        this.score += 100 * this.level;
        
        // Check if reached level 10 - stop timer and show final time
        if (this.level >= 10) {
            this.stopTimer();
            this.statusElement.textContent = `🏆 LEVEL 10 REACHED! Final Time: ${this.getFormattedTime()}`;
            this.statusElement.className = 'win';
            this.gameRunning = false;
            this.restartBtn.style.display = 'block';
            this.fullResetBtn.style.display = 'block';
            this.updateScore();
            return;
        }
        
        // Save checkpoint progress (level 3 becomes permanent checkpoint once reached)
        if (this.level >= 3) {
            this.checkpointLevel = 3; // Always reset to level 3 once reached
        } else {
            this.checkpointLevel = this.level;
        }
        this.checkpointScore = this.score;
        
        this.statusElement.textContent = `Level ${this.level}! Progress Saved!`;
        this.statusElement.className = 'win';
        
        // Reset player position
        this.player.x = 30;
        this.player.y = this.height - 160;
        this.player.velocityY = 0;
        this.player.onGround = false;
        this.player.onLog = false;
        
        // Clear logs
        this.logs = [];
        this.logSpawnTimer = 0;
        
        // Clear alligators
        this.alligators = [];
        this.alligatorSpawnTimer = 0;
        
        this.updateScore();
        
        // Clear status after 2 seconds
        setTimeout(() => {
            if (this.gameRunning) {
                this.statusElement.textContent = '';
                this.statusElement.className = '';
            }
        }, 2000);
    }
    
    gameOver(won) {
        this.gameRunning = false;
        if (won) {
            this.score += 100;
            this.statusElement.textContent = 'You made it across! Well done!';
            this.statusElement.className = 'win';
        } else {
            if (this.checkpointLevel > 1) {
                this.statusElement.textContent = `You died! Restarting from Level ${this.checkpointLevel}`;
            } else {
                this.statusElement.textContent = 'You fell in the water! Game Over!';
            }
            this.statusElement.className = 'lose';
        }
        this.restartBtn.style.display = 'block';
        this.fullResetBtn.style.display = 'block';
        this.updateScore();
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        this.levelElement.textContent = this.level;
    }
    
    restart() {
        // Reset player
        this.player.x = 30;
        this.player.y = this.height - 160;
        this.player.velocityY = 0;
        this.player.onGround = false;
        this.player.onLog = false;
        
        // Clear logs
        this.logs = [];
        this.logSpawnTimer = 0;
        
        // Clear alligators
        this.alligators = [];
        this.alligatorSpawnTimer = 0;
        
        // Reset to checkpoint (or level 1 if no checkpoint)
        this.level = this.checkpointLevel;
        this.score = this.checkpointScore;
        this.gameRunning = true;
        this.gameStarted = true;
        this.statusElement.textContent = '';
        this.statusElement.className = '';
        this.restartBtn.style.display = 'none';
        this.fullResetBtn.style.display = 'none';
        this.updateScore();
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw sky (top part)
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.width, this.riverTop);
        
        // Draw river
        this.ctx.fillStyle = '#4682B4';
        this.ctx.fillRect(0, this.riverTop, this.width, this.riverBottom - this.riverTop);
        
        // Draw ground
        this.ctx.fillStyle = '#8FBC8F';
        this.ctx.fillRect(0, this.height - this.groundHeight, this.width, this.groundHeight);
        
        // Draw starting platform
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(0, this.riverTop, 80, this.riverBottom - this.riverTop);
        
        // Draw ending platform
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(this.width - 80, this.riverTop, 80, this.riverBottom - this.riverTop);
        
        // Draw island
        this.ctx.fillStyle = '#8FBC8F'; // Same green as ground
        this.ctx.fillRect(this.island.x, this.island.y, this.island.width, this.island.height);
        
        // Add some island details (rocks/vegetation)
        this.ctx.fillStyle = '#708B75';
        this.ctx.fillRect(this.island.x + 5, this.island.y + 2, 8, 8);
        this.ctx.fillRect(this.island.x + 25, this.island.y + 3, 6, 6);
        this.ctx.fillRect(this.island.x + 45, this.island.y + 1, 10, 10);
        this.ctx.fillRect(this.island.x + 65, this.island.y + 4, 7, 7);
        
        // Add a small tree on island
        this.ctx.fillStyle = '#8B4513'; // Brown trunk
        this.ctx.fillRect(this.island.x + 35, this.island.y - 15, 4, 15);
        this.ctx.fillStyle = '#228B22'; // Green leaves
        this.ctx.fillRect(this.island.x + 30, this.island.y - 20, 14, 12);
        
        // Draw flag
        // Flag pole
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(this.flag.x + 2, this.flag.y, 3, this.flag.height);
        
        // Flag itself
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(this.flag.x + 5, this.flag.y, 15, 12);
        
        // Flag details (white stripes)
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(this.flag.x + 5, this.flag.y + 3, 15, 2);
        this.ctx.fillRect(this.flag.x + 5, this.flag.y + 7, 15, 2);
        
        // Draw logs
        for (let log of this.logs) {
            this.ctx.fillStyle = log.color;
            this.ctx.fillRect(log.x, log.y, log.width, log.height);
            
            // Add log texture
            this.ctx.fillStyle = '#654321';
            for (let i = 0; i < log.width; i += 10) {
                this.ctx.fillRect(log.x + i, log.y + 2, 2, log.height - 4);
            }
        }
        
        // Draw alligators
        for (let alligator of this.alligators) {
            // Alligator body
            this.ctx.fillStyle = alligator.color;
            this.ctx.fillRect(alligator.x, alligator.y, alligator.width, alligator.height);
            
            // Alligator head (front part)
            this.ctx.fillStyle = '#1C3D1C'; // Darker green for head
            this.ctx.fillRect(alligator.x, alligator.y + 2, 15, alligator.height - 4);
            
            // Eyes (small white dots)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(alligator.x + 3, alligator.y + 2, 2, 2);
            this.ctx.fillRect(alligator.x + 8, alligator.y + 2, 2, 2);
            
            // Tail texture (ridges)
            this.ctx.fillStyle = '#1C3D1C';
            for (let i = 15; i < alligator.width; i += 8) {
                this.ctx.fillRect(alligator.x + i, alligator.y + 1, 2, alligator.height - 2);
            }
        }
        
        // Draw particles
        for (let particle of this.particles) {
            if (particle.type === 'splash') {
                // Draw splash particles as small circles
                this.ctx.globalAlpha = particle.life / particle.maxLife;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                
            } else if (particle.type === 'ripple') {
                // Draw ripple as expanding circle outline
                this.ctx.globalAlpha = particle.alpha * 0.7; // Even more transparent
                this.ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)'; // Softer blue-white color
                this.ctx.lineWidth = 0.5; // Thinner line
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }
        }
        
        // Draw player (lumberjack)
        // Body
        this.ctx.fillStyle = '#8B0000';
        this.ctx.fillRect(this.player.x + 6, this.player.y + 15, 8, 12);
        
        // Head
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.fillRect(this.player.x + 7, this.player.y + 5, 6, 8);
        
        // Hat
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(this.player.x + 5, this.player.y, 10, 8);
        
        // Legs
        this.ctx.fillStyle = '#000080';
        this.ctx.fillRect(this.player.x + 6, this.player.y + 25, 3, 5);
        this.ctx.fillRect(this.player.x + 11, this.player.y + 25, 3, 5);
        
        // Arms
        this.ctx.fillStyle = '#FDBCB4';
        this.ctx.fillRect(this.player.x + 2, this.player.y + 16, 4, 6);
        this.ctx.fillRect(this.player.x + 14, this.player.y + 16, 4, 6);
        
        // Show instructions if game not started
        if (!this.gameStarted) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Lumberjack Run', this.width / 2, this.height / 2 - 60);
            this.ctx.fillText('Use Arrow Keys to Move', this.width / 2, this.height / 2 - 30);
            this.ctx.fillText('Spacebar to Jump', this.width / 2, this.height / 2);
            this.ctx.fillText('Cross the river and reach the flag!', this.width / 2, this.height / 2 + 30);
            this.ctx.fillText('Press any key to start', this.width / 2, this.height / 2 + 60);
        }
    }
    
    fullReset() {
        // Reset player
        this.player.x = 30;
        this.player.y = this.height - 160;
        this.player.velocityY = 0;
        this.player.onGround = false;
        this.player.onLog = false;
        
        // Clear logs
        this.logs = [];
        this.logSpawnTimer = 0;
        
        // Clear alligators
        this.alligators = [];
        this.alligatorSpawnTimer = 0;
        
        // Complete reset to level 1
        this.level = 1;
        this.score = 0;
        this.checkpointLevel = 1;
        this.checkpointScore = 0;
        this.gameRunning = true;
        this.gameStarted = true;
        this.statusElement.textContent = '';
        this.statusElement.className = '';
        this.restartBtn.style.display = 'none';
        this.fullResetBtn.style.display = 'none';
        
        // Reset timer
        this.resetTimer();
        this.startTimer();
        
        this.updateScore();
    }
    
    startMusic() {
        // Modern browsers require user interaction to play audio
        // We'll try to play when the user starts the game
        if (this.musicPlaying) {
            console.log('Attempting to start music...');
            this.backgroundMusic.play().then(() => {
                console.log('Music started successfully!');
            }).catch((error) => {
                console.log('Music autoplay failed:', error);
                console.log('Music will need manual activation via button.');
            });
        }
    }
    
    toggleMusic() {
        console.log('Music toggle clicked, current state:', this.musicPlaying);
        if (this.musicPlaying) {
            this.backgroundMusic.pause();
            this.musicToggle.textContent = '🎵 Music: OFF';
            this.musicPlaying = false;
            console.log('Music paused');
        } else {
            this.backgroundMusic.play().then(() => {
                console.log('Music resumed successfully');
            }).catch((error) => {
                console.error('Failed to play music:', error);
            });
            this.musicToggle.textContent = '🎵 Music: ON';
            this.musicPlaying = true;
        }
    }
    
    startTimer() {
        if (!this.timerRunning) {
            this.timerStartTime = Date.now();
            this.timerRunning = true;
            this.finalTime = null;
        }
    }
    
    stopTimer() {
        if (this.timerRunning) {
            this.finalTime = Date.now() - this.timerStartTime;
            this.timerRunning = false;
        }
    }
    
    resetTimer() {
        this.timerStartTime = null;
        this.timerRunning = false;
        this.finalTime = null;
    }
    
    getCurrentTime() {
        if (this.finalTime !== null) {
            return this.finalTime;
        }
        if (this.timerRunning && this.timerStartTime) {
            return Date.now() - this.timerStartTime;
        }
        return 0;
    }
    
    getFormattedTime() {
        const time = this.getCurrentTime();
        const minutes = Math.floor(time / 60000);
        const seconds = Math.floor((time % 60000) / 1000);
        const milliseconds = Math.floor((time % 1000) / 10);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }
    
    updateTimer() {
        if (this.timerElement) {
            this.timerElement.textContent = this.getFormattedTime();
        }
    }
    
    gameLoop() {
        this.updatePlayer();
        this.updateLogs();
        this.updateAlligators();
        this.updateParticles();
        this.checkCollisions();
        this.updateTimer();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new LumberjackGame();
});
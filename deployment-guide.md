# Face Memory Challenge - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Heroku (Recommended for beginners)

1. **Install Heroku CLI**
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login
```

2. **Prepare your project**
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create Heroku app
heroku create face-memory-challenge

# Add Redis addon
heroku addons:create heroku-redis:mini
```

3. **Configure environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set REDIS_URL=redis://localhost:6379
```

4. **Deploy**
```bash
git push heroku main
heroku open
```

### Option 2: Railway (Modern & Easy)

1. **Connect GitHub repository**
   - Go to [Railway.app](https://railway.app)
   - Connect your GitHub account
   - Import your repository

2. **Add Redis service**
   - Click "New" → "Database" → "Redis"
   - Railway will automatically set REDIS_URL

3. **Configure environment variables**
   - Add `NODE_ENV=production`
   - Add `PORT=3000`

4. **Deploy automatically**
   - Railway deploys on every git push

### Option 3: DigitalOcean App Platform

1. **Create app**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository

2. **Configure build settings**
```yaml
name: face-memory-challenge
services:
- name: api
  source_dir: /
  github:
    repo: your-username/face-memory-challenge
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: REDIS_URL
    value: ${redis.DATABASE_URL}

databases:
- name: redis
  engine: REDIS
  version: "6"
```

## 🔧 Local Development Setup

### Prerequisites
```bash
# Install Node.js (v16 or higher)
# Install Redis locally

# On macOS
brew install redis
brew services start redis

# On Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# On Windows
# Download Redis from https://redis.io/download
```

### Setup Steps
```bash
# Clone repository
git clone <your-repo-url>
cd face-memory-challenge

# Install dependencies
npm install

# Create uploads directory
mkdir uploads

# Start Redis (if not running as service)
redis-server

# Start development server
npm run dev
```

### Environment Variables (.env)
```env
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
MONGODB_URL=mongodb://localhost:27017/face-memory-challenge
JWT_SECRET=your-super-secret-jwt-key
UPLOAD_MAX_SIZE=5242880
```

## 🌐 Frontend Integration

### Add Socket.IO to your HTML
```html
<!-- Add before your script.js -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="client-integration.js"></script>
<script src="script.js"></script>
```

### Update your existing script.js
Replace the last line:
```javascript
// OLD
document.addEventListener('DOMContentLoaded', () => {
    game = new FaceGuessingGame();
});

// NEW
document.addEventListener('DOMContentLoaded', () => {
    if (typeof io !== 'undefined') {
        window.game = new EnhancedFaceGuessingGame();
    } else {
        window.game = new FaceGuessingGame();
    }
});
```

## 📊 Production Optimizations

### 1. Enable Compression
```javascript
const compression = require('compression');
app.use(compression());
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Security Headers
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4. Process Management
```javascript
// Use PM2 for production
npm install -g pm2

// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'face-memory-challenge',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        }
    }]
};

// Start with PM2
pm2 start ecosystem.config.js --env production
```

## 🔍 Monitoring & Analytics

### 1. Health Checks
```javascript
// Add to server.js
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeGames: gameManager.games.size
    });
});
```

### 2. Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
```

### 3. Performance Monitoring
```javascript
// Add performance monitoring
const responseTime = require('response-time');
app.use(responseTime());

// Track Socket.IO performance
io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
});
```

## 🔒 Security Considerations

### 1. Input Validation
```javascript
const joi = require('joi');

const roomCodeSchema = joi.string().alphanum().length(6);
const playerNameSchema = joi.string().min(1).max(20).required();

// Validate in socket handlers
socket.on('join-room', (data) => {
    const { error } = joi.object({
        roomCode: roomCodeSchema,
        playerName: playerNameSchema
    }).validate(data);
    
    if (error) {
        socket.emit('error', { message: 'Invalid input' });
        return;
    }
    
    // Continue with join logic...
});
```

### 2. Rate Limiting for Socket Events
```javascript
const socketRateLimit = new Map();

function checkRateLimit(socketId, event, maxRequests = 10, windowMs = 60000) {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    
    if (!socketRateLimit.has(key)) {
        socketRateLimit.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    const limit = socketRateLimit.get(key);
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + windowMs;
        return true;
    }
    
    if (limit.count >= maxRequests) {
        return false;
    }
    
    limit.count++;
    return true;
}
```

### 3. Image Upload Security
```javascript
const fileType = require('file-type');

const secureUpload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: async (req, file, cb) => {
        try {
            const type = await fileType.fromBuffer(file.buffer);
            if (type && type.mime.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Invalid file type'));
            }
        } catch (error) {
            cb(error);
        }
    }
});
```

## 📱 Mobile Optimization

### 1. Responsive Socket Handling
```javascript
// Handle mobile network changes
socket.on('disconnect', (reason) => {
    if (reason === 'transport close' || reason === 'transport error') {
        // Mobile network issue, attempt reconnection
        setTimeout(() => {
            socket.connect();
        }, 1000);
    }
});
```

### 2. Touch Event Optimization
```javascript
// Optimize for mobile touch events
let touchStartTime = 0;

gridCell.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
});

gridCell.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration < 500) { // Quick tap
        handleGridClick(e);
    }
});
```

## 🚀 Scaling Considerations

### 1. Horizontal Scaling with Redis Adapter
```javascript
const redisAdapter = require('socket.io-redis');
io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));
```

### 2. Load Balancing
```javascript
// Use sticky sessions for Socket.IO
const sticky = require('sticky-session');

if (sticky.listen(server, 3000)) {
    server.once('listening', () => {
        console.log('Server started on port 3000');
    });
} else {
    // Worker process
    server.listen(0, 'localhost');
}
```

### 3. Database Optimization
```javascript
// Use connection pooling
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});
```

This comprehensive backend setup will handle multiple users joining simultaneously and clicking targets in real-time with excellent performance and scalability!
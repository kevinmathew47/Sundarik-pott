<<<<<<< HEAD
# 🎯 Sundarik Pott - Face Memory Challenge

A real-time multiplayer memory game where players memorize face positions and click on targets with precision scoring.

## 🎮 Game Features

- **Admin Control Panel**: Complete game management with custom room IDs
- **Real-time Multiplayer**: Multiple players join simultaneously 
- **Precision Scoring**: 100 points for exact hits, 50 for adjacent cells
- **Classical UI**: Elegant design with yellow/orange theme
- **Mobile Friendly**: Responsive design for all devices
- **Live Leaderboard**: Real-time score updates

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start server
npm start

# Open in browser
# Admin Panel: http://localhost:3000/admin.html
# Client Game: http://localhost:3000/
```

### Live Deployment
Deploy to Railway, Render, or Heroku for live multiplayer gaming.

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🎯 How to Play

### For Admin:
1. Open admin panel (`/admin.html`)
2. Create room with custom ID (e.g., "GAME2024")
3. Upload face image and set target position
4. Configure game settings (view time, rounds, etc.)
5. Wait for players to join
6. Start the game!

### For Players:
1. Open client page (`/`)
2. Enter Room ID provided by admin
3. Enter your name
4. Wait for admin to start
5. Memorize the face and target position (5 seconds)
6. Click on the grid where you saw the target
7. Compete for the highest score!

## 🏆 Scoring System

- 🎯 **Exact Position**: +100 points
- 🌟 **Adjacent Cell**: +50 points  
- ❌ **Wrong Position**: 0 points
- ⚠️ **Outside Section**: -10 points
- 🚫 **Outside Matrix**: -25 points

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Styling**: Custom CSS with classical design
- **Fonts**: Playfair Display, Crimson Text, Cormorant Garamond

## 📁 Project Structure

```
├── index.html              # Client game interface
├── admin.html              # Admin control panel
├── styles.css              # Client styling
├── admin-styles.css        # Admin panel styling
├── client-script.js        # Client game logic
├── admin-script.js         # Admin panel logic
├── server-simple.js        # Backend server
├── package.json            # Dependencies
└── DEPLOYMENT.md           # Deployment guide
```

## 🌐 Live Demo

Deploy to any of these platforms:
- **Railway** (Recommended): Perfect for Socket.IO apps
- **Render**: Free tier with cold starts
- **Heroku**: Classic hosting option

## 🎨 Design Features

- **Classical Typography**: Elegant serif fonts
- **Ornate Styling**: Decorative borders and shadows
- **Responsive Layout**: Works on desktop and mobile
- **Color Scheme**: Yellow, orange, and white theme
- **Smooth Animations**: Polished user experience

## 🔧 Configuration

Game settings can be configured in the admin panel:
- **View Time**: How long players see the image (default: 5s)
- **Guess Time**: How long players have to click (default: 20s)
- **Total Rounds**: Number of rounds per game (default: 10)
- **Min Players**: Minimum players to start (default: 2)

## 📱 Mobile Support

Fully responsive design optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch interfaces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for educational or commercial purposes.

## 🎯 Credits

Created with ❤️ for multiplayer gaming experiences.

---

**Ready to test your memory and precision? Start playing Sundarik Pott!** 🎮✨
=======
# Sundarik-pott
>>>>>>> 1e0a90842469945163882fe2906f50d7b9c8c9ec

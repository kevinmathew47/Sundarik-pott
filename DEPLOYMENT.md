# 🚀 Face Memory Challenge - Live Deployment Guide

## 🎯 Quick Deploy (5 Minutes)

### Option 1: Railway (Recommended)
**Best for Socket.IO apps, easiest deployment**

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/face-memory-challenge.git
   git push -u origin main
   ```

2. **Deploy to Railway:**
   - Go to [Railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway automatically deploys!

3. **Access Your Game:**
   - Admin Panel: `https://your-app.railway.app/admin.html`
   - Client Game: `https://your-app.railway.app/`

### Option 2: Render (Free)
**Completely free but has cold starts**

1. **Push to GitHub** (same as above)

2. **Deploy to Render:**
   - Go to [Render.com](https://render.com)
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your repository
   - Configure:
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Plan: Free

3. **Access Your Game:**
   - Admin Panel: `https://your-app.onrender.com/admin.html`
   - Client Game: `https://your-app.onrender.com/`

### Option 3: Heroku
**Classic option, requires credit card for free tier**

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Deploy:**
   ```bash
   heroku login
   heroku create face-memory-challenge
   git push heroku main
   heroku open
   ```

## 🔧 Environment Setup

### Required Files (Already Created):
- ✅ `package.json` - Dependencies and scripts
- ✅ `Procfile` - Process management
- ✅ `.gitignore` - Files to ignore
- ✅ Server auto-detects production URLs

### No Additional Configuration Needed!
The app automatically:
- Detects if running locally or in production
- Uses correct Socket.IO URLs
- Serves static files properly
- Handles CORS for cross-origin requests

## 📱 How to Use After Deployment

### For Admin:
1. Go to `https://your-app-url.com/admin.html`
2. Create a room (e.g., "GAME2024")
3. Upload face image and set target
4. Configure settings (5s view time, etc.)
5. Wait for players to join
6. Click "Start Game"

### For Players:
1. Go to `https://your-app-url.com/`
2. Enter Room ID (from admin)
3. Enter their name
4. Wait for admin to start
5. Play the game!

## 🌐 Custom Domain (Optional)

### Railway:
- Go to project settings
- Add custom domain
- Update DNS records

### Render:
- Go to project settings
- Add custom domain (free on all plans)
- Update DNS records

## 💰 Costs

### Railway:
- **Free**: $5 credit/month (good for small games)
- **Pro**: $20/month unlimited

### Render:
- **Free**: Always free (with cold starts)
- **Paid**: $7/month (always-on)

### Heroku:
- **Free**: Requires credit card, limited hours
- **Paid**: $7/month per dyno

## 🔍 Monitoring

### Check if your app is running:
- Visit: `https://your-app-url.com/health`
- Should show: `{"status":"healthy","activeGames":0}`

### Logs:
- **Railway**: View in dashboard
- **Render**: View in dashboard  
- **Heroku**: `heroku logs --tail`

## 🚨 Troubleshooting

### Common Issues:

1. **Socket.IO not connecting:**
   - Check browser console for errors
   - Ensure HTTPS is used in production
   - Verify server URL is correct

2. **App sleeping (Render free tier):**
   - First visit takes 30-60 seconds
   - Consider upgrading to paid plan

3. **Build failures:**
   - Check Node.js version in `package.json`
   - Ensure all dependencies are listed

### Quick Fixes:
```bash
# Redeploy
git add .
git commit -m "Fix deployment"
git push origin main
```

## 🎯 Success!
Your Face Memory Challenge is now live and ready for multiplayer gaming! Share the URL with friends and start playing! 🎮✨
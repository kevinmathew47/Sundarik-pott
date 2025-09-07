# Deploy to Render (Free Option)

## Why Render?
- ✅ Completely FREE tier
- ✅ Supports Socket.IO
- ✅ GitHub integration
- ✅ Custom domains on free tier
- ✅ Automatic SSL certificates

## Step-by-Step Deployment

### 1. Prepare Your Project
Make sure you have these files:

**package.json**:
```json
{
  "name": "face-memory-challenge",
  "version": "1.0.0",
  "main": "server-simple.js",
  "scripts": {
    "start": "node server-simple.js"
  },
  "dependencies": {
    "express": "4.19.2",
    "socket.io": "4.8.0",
    "cors": "2.8.5",
    "uuid": "10.0.0"
  },
  "engines": {
    "node": "16"
  }
}
```

### 2. Deploy to Render

1. **Go to [Render.com](https://render.com)**
2. **Sign up** with GitHub
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure:**
   - **Name**: `face-memory-challenge`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

### 3. Environment Variables
In Render dashboard:
- Go to "Environment" tab
- Add: `NODE_ENV` = `production`

### 4. Access Your App
Render gives you a URL like:
- **Admin Panel**: `https://face-memory-challenge.onrender.com/admin.html`
- **Client Game**: `https://face-memory-challenge.onrender.com/`

## Important Notes
- **Free tier sleeps** after 15 minutes of inactivity
- **Cold start** takes 30-60 seconds to wake up
- **Upgrade to paid** ($7/month) for always-on service
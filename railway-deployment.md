# Deploy to Railway (Recommended)

## Why Railway?
- ✅ Perfect for Socket.IO apps
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Built-in Redis support
- ✅ Custom domains
- ✅ Easy environment variables

## Step-by-Step Deployment

### 1. Prepare Your Project
Create these files in your project root:

**package.json** (if not exists):
```json
{
  "name": "face-memory-challenge",
  "version": "1.0.0",
  "description": "Real-time multiplayer Face Memory Challenge",
  "main": "server-simple.js",
  "scripts": {
    "start": "node server-simple.js",
    "dev": "node server-simple.js"
  },
  "dependencies": {
    "express": "4.19.2",
    "socket.io": "4.8.0",
    "cors": "2.8.5",
    "uuid": "10.0.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

**Procfile** (for process management):
```
web: node server-simple.js
```

### 2. Deploy to Railway

1. **Go to [Railway.app](https://railway.app)**
2. **Sign up** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Connect your repository**
6. **Railway will automatically:**
   - Detect it's a Node.js app
   - Install dependencies
   - Start the server
   - Give you a live URL

### 3. Environment Variables (Optional)
In Railway dashboard:
- Go to your project
- Click "Variables" tab
- Add: `PORT` = `3000` (Railway sets this automatically)

### 4. Custom Domain (Optional)
- In Railway dashboard
- Go to "Settings" → "Domains"
- Add your custom domain

### 5. Access Your App
Railway will give you URLs like:
- **Admin Panel**: `https://your-app.railway.app/admin.html`
- **Client Game**: `https://your-app.railway.app/`

## Cost
- **Free Tier**: $5 credit per month (enough for small games)
- **Pro**: $20/month for unlimited usage
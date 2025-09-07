# Vercel Deployment (Limited Support)

## ⚠️ Important Limitations
Vercel is designed for **serverless functions**, not persistent Socket.IO connections. However, you can deploy a **limited version**:

### What Works on Vercel:
- ✅ Static file hosting (HTML, CSS, JS)
- ✅ API routes for basic functionality
- ❌ Real-time Socket.IO connections
- ❌ Persistent game state
- ❌ Live multiplayer features

## Option 1: Static Version Only
Deploy just the frontend files to Vercel for demo purposes:

### 1. Create vercel.json
```json
{
  "builds": [
    {
      "src": "*.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/admin",
      "dest": "/admin.html"
    },
    {
      "src": "/",
      "dest": "/index.html"
    }
  ]
}
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts
```

## Option 2: Hybrid Approach
Use Vercel for frontend + external service for backend:

### Frontend on Vercel:
- Host `index.html`, `admin.html`, CSS files
- Update Socket.IO connection to external server

### Backend on Railway/Render:
- Deploy `server-simple.js` to Railway or Render
- Get the live URL (e.g., `https://your-app.railway.app`)

### Update Client Code:
```javascript
// In client-script.js and admin-script.js
// Change this line:
this.socket = io('http://localhost:3000');

// To your live server URL:
this.socket = io('https://your-app.railway.app');
```

## Recommended Approach
**Don't use Vercel for Socket.IO apps**. Use Railway or Render instead for the complete experience.
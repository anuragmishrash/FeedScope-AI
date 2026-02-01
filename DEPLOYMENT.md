# FeedScope AI - Deployment Guide

## 📦 Deployment Overview

This guide covers deploying FeedScope AI to production using:
- **Vercel** - Frontend (React)
- **Render** - Backend (Node.js) + Sentiment Service (Python)
- **MongoDB Atlas** - Database

---

## 🚀 Quick Deployment Steps

### 1. MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist all IPs: `0.0.0.0/0`
5. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/feedscope`

---

### 2. Deploy Backend to Render

**Create Web Service:**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `feedscope-backend`
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. **Environment Variables:**
   ```
   PORT=5000
   MONGO_URI=<your-mongodb-atlas-connection-string>
   JWT_SECRET=<generate-random-secret-min-32-chars>
   SENTIMENT_SERVICE_URL=<will-be-set-after-sentiment-service-deployed>
   NODE_ENV=production
   ```

6. Click "Create Web Service"
7. Wait for deployment (2-3 minutes)
8. Copy the URL: `https://feedscope-backend.onrender.com`

---

### 3. Deploy Sentiment Service to Render

**Create Web Service:**

1. Click "New +" → "Web Service"
2. Connect same GitHub repository
3. Configure:
   - **Name:** `feedscope-sentiment`
   - **Region:** Same as backend
   - **Branch:** `main`
   - **Root Directory:** `sentiment-service`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free

4. **Environment Variables:**
   ```
   PORT=8001
   MODEL_NAME=distilbert-base-uncased-finetuned-sst-2-english
   ENVIRONMENT=production
   ```

5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes - model downloads on first start)
7. Copy the URL: `https://feedscope-sentiment.onrender.com`

8. **Update Backend Environment:**
   - Go back to backend service
   - Add/Update: `SENTIMENT_SERVICE_URL=https://feedscope-sentiment.onrender.com`
   - Redeploy backend

---

### 4. Deploy Frontend to Vercel

**Deploy via Vercel CLI or Dashboard:**

#### Option A: Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. **Environment Variables:**
   ```
   VITE_API_URL=https://feedscope-backend.onrender.com/api
   ```

6. Click "Deploy"
7. Wait for deployment (1-2 minutes)
8. Get URL: `https://feedscope-ai.vercel.app`

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to client directory
cd client

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://feedscope-backend.onrender.com/api
```

---

## 🔧 Post-Deployment Configuration

### 1. Update CORS on Backend

**File:** `server/src/server.js`

Update CORS to allow your frontend domain:

```javascript
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://feedscope-ai.vercel.app',  // Your Vercel domain
        'https://your-custom-domain.com'     // If you have custom domain
    ],
    credentials: true
}));
```

Redeploy backend after this change.

### 2. Seed Admin User

After backend is deployed, seed the admin user:

**Option 1: Render Shell**
1. Go to Render Dashboard → Backend Service
2. Click "Shell" tab
3. Run: `npm run seed`

**Option 2: Via API** (if health endpoint works)
```bash
curl -X POST https://feedscope-backend.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@feedscope.com",
    "password": "admin123",
    "role": "admin"
  }'
```

### 3. Test Deployment

1. **Frontend:** Visit `https://feedscope-ai.vercel.app`
2. **Login:** admin@feedscope.com / admin123
3. **Submit feedback:** Test voice/text input
4. **Check dashboard:** Verify charts and analytics work
5. **Test sentiment:** Submit negative feedback, verify classification

---

## 📊 Deployment URLs Summary

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | `https://feedscope-ai.vercel.app` | Vercel auto-assigns domain |
| Backend API | `https://feedscope-backend.onrender.com` | Render auto-assigns domain |
| Sentiment Service | `https://feedscope-sentiment.onrender.com` | Render auto-assigns domain |
| API Docs | `https://feedscope-backend.onrender.com/api-docs` | Swagger UI |
| Health Check | `https://feedscope-backend.onrender.com/health` | Backend status |

---

## ⚠️ Important Notes

### Render Free Tier Limitations

- **Spin down after 15 minutes** of inactivity
- **First request after spin-down** takes 30-60 seconds
- **Sentiment service** may take 60-90 seconds (model loading)
- Consider keeping services awake with UptimeRobot or similar

### MongoDB Atlas Free Tier

- **512 MB storage** limit
- **Unlimited connections** (but rate-limited)
- Consider cleanup of old feedback periodically

### HuggingFace Model

- Model downloads on **first deployment** only
- **~400 MB** - included in Render's disk allowance
- Subsequent deploys reuse cached model

---

## 🔍 Troubleshooting

### Backend Won't Start
- Check environment variables are set correctly
- Verify MongoDB connection string (whitelist 0.0.0.0/0)
- Check Render logs for errors

### Sentiment Service Timeout
- First request after deployment takes 60-90 seconds
- Check Render logs - model should download successfully
- Verify SENTIMENT_SERVICE_URL in backend env vars

### Frontend Can't Connect to Backend
- Verify VITE_API_URL in Vercel environment variables
- Check CORS settings in backend
- Ensure backend URL is correct (https, no trailing slash in env var)

### CORS Errors
- Add Vercel domain to CORS allowed origins in server.js
- Redeploy backend after CORS changes
- Clear browser cache

---

## 🎉 You're Live!

Your FeedScope AI application is now deployed and accessible worldwide!

**Share your app:**
- Frontend: `https://feedscope-ai.vercel.app`
- Show off the features: Multi-language voice input, AI sentiment analysis, emotion detection, real-time analytics!

**Monitor:**
- Render Dashboard: View logs and metrics
- Vercel Analytics: Track visitor stats
- MongoDB Atlas: Monitor database usage

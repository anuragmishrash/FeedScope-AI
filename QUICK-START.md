# Quick Start Guide - FeedScope AI

## 🚀 Step-by-Step Setup (Windows)

### Step 1: Setup Python Sentiment Service

Open PowerShell in project root and run:

```powershell
cd sentiment-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn transformers torch pydantic python-multipart
```

**If you get execution policy error**, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then start the service:
```powershell
python main.py
```

Keep this terminal open. Service runs on `http://127.0.0.1:8001`

---

### Step 2: Start Backend Server

Open a **NEW** PowerShell terminal:

```powershell
cd server
npm run dev
```

Keep this terminal open. Server runs on `http://localhost:5000`

---

### Step 3: Start Frontend

Open a **NEW** PowerShell terminal:

```powershell
cd client
npm run dev
```

Frontend runs on `http://localhost:3000`

---

## 🔐 Login

**Admin Credentials:**
- Email: `itsanuragmishra99@gmail.com`
- Password: `987654321Anu`

**Or create a new user** by clicking "Sign up"

---

## ✅ Verify It's Working

1. Open browser: `http://localhost:3000`
2. Login with admin credentials
3. You should see the admin dashboard with charts
4. Try submitting feedback as a regular user
5. Check feedback appears in admin dashboard

---

## 🐛 Troubleshooting

**Python service won't start:**
- Make sure Python 3.10+ is installed
- Try: `pip install --upgrade pip` first
- On Windows, PyTorch download takes time (be patient)

**Backend error "Module not found":**
```powershell
cd server
npm install
```

**Frontend error:**
```powershell
cd client
npm install
```

**Microphone permission for voice input:**
- Browser will ask permission first time
- Grant access to test voice feedback

---

## 📁 Terminal Summary

You need **3 terminals running simultaneously**:

1. **Terminal 1:** Python service (port 8001)
2. **Terminal 2:** Express backend (port 5000)  
3. **Terminal 3:** React frontend (port 3000)

All must be running for full functionality!

# FeedScope AI 🚀

![FeedScope AI Header](https://via.placeholder.com/1200x400/0f172a/6366f1?text=FeedScope+AI+-+Intelligent+Feedback+System)

A production-grade, real-time MERN web application with **Multilingual AI Sentiment Analysis**, **Voice Input**, and a highly interactive **Admin Analytics Dashboard**. FeedScope AI goes beyond simple feedback collection by orchestrating contextual AI responses, analyzing complex emotional tone across languages, and surfacing executive insights effortlessly.

---

## ✨ Cutting-Edge Features

### 🧠 Advanced AI & NLP
- **Multilingual Sentiment Analysis (XLM-RoBERTa)**: Natively parses 100+ languages (including Hindi & English) detecting nuanced context, double negatives, slang, and emojis.
- **Dual AI Response Orchestration**: Automatically generates two unique responses per ticket:
  - **User Acknowledgment**: Instant, empathetic confirmation sent to the user's tracking page.
  - **Admin Resolution Draft**: Action-oriented response pre-filled for the administrative team.
- **AI Executive Summaries (Gemini 2.5 Flash)**: Generates highly detailed overview reports of all platform feedback with smart 1-hour caching and real-time "stale data" warnings.
- **Emotion & Category Prediction**: Granular classification identifying specific emotions (Frustrated, Satisfied, Angry) mapping them to actionable categories.

### ⚡ Real-Time Architecture
- **Socket.io Live Syncing**: Admin dashboards update instantaneously. New feedback, status changes, and newly claimed tickets flash on-screen without requiring browser refreshes.
- **Instant Live Stats**: KPI counters and charts update dynamically via WebSocket events.

### 🎯 Seamless User Experience
- **Voice-to-Text Feedback**: Bilingual Web Speech API integration allows for frictionless audio feedback submission.
- **Ticket Tracking & Claiming**: Anonymous users receive tracking IDs (e.g., `FSC-20260325-A7X2`). Users can later sign up and "claim" these tickets to attach them to their permanent account history.
- **Glassmorphism Premium UI**: Built with Tailwind CSS and Framer Motion for buttery-smooth animations and modern deep-dark aesthetics.

### 📊 Comprehensive Admin Dashboard
- **Actionable Analytics**: Deep-dive charts (Pie, Bar, Line) via Recharts.
- **Critical Alert System**: Auto-flags high-priority feedback (Very Negative sentiment + lowest ratings) to demand immediate attention.
- **Multi-dimensional Filtering**: Instantly sort by date ranges, sentiment, categories, priorities, and status.
- **Report Generation**: Export full datasets to CSV or generate polished PDF reports.

---

## 🛠️ Technology Stack

| Domain | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide Icons |
| **Backend** | Node.js, Express, Socket.io, JWT, bcryptjs |
| **Database** | MongoDB Atlas, Mongoose |
| **AI / NLP Services** | Python, FastAPI, HuggingFace (`cardiffnlp/twitter-xlm-roberta-base-sentiment`), PyTorch, Google Gemini API |

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas account (or local MongoDB)

### 1. Clone Repository
```bash
git clone https://github.com/anuragmishrash/FeedScope-AI.git
cd FeedScope-AI
```

### 2. Setup Python NLP Microservice
The sentiment service utilizes a 400MB transformer model which is downloaded on first run.
```bash
cd sentiment-service
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
python main.py
# Runs on http://127.0.0.1:8001
```

### 3. Setup Node.js Backend
```bash
cd ../server
npm install
npm run dev
# Runs on http://localhost:5000 with Socket.io attached
```
*(Ensure you duplicate `.env.example` to `.env` and fill in your `MONGO_URI` and `GEMINI_API_KEY`)*

### 4. Setup React Frontend
```bash
cd ../client
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## 🚀 Running the Application Properly
To experience the full power of FeedScope AI, **all three services must run simultaneously**. For a one-click startup on Windows, run the provided batch script:
```bash
START-ALL.bat
```

Open your browser and navigate to: **http://localhost:3000**

---

## 👤 Admin Credentials
*The system creates an admin account automatically when the backend boots for the first time.*
- **Email:** `itsanuragmishra99@gmail.com`
- **Password:** `987654321Anu`

---

## 🌐 Environment Variables Setup
### Server (`server/.env`)
```env
MONGO_URI=mongodb+srv://<your_user>:<your_pass>@cluster...
JWT_SECRET=your_super_secret_key
PORT=5000
SENTIMENT_SERVICE_URL=http://127.0.0.1:8001
GEMINI_API_KEY=your_gemini_key_here
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🔒 Security & Anti-Spam
- **Dual Spam Protection**: Submissions are strictly rate-limited (Max 3 per minute/IP) alongside a text-similarity check to silently discard 90%+ duplicate ranting.
- **RESTful Authencation**: JWT-based auth flows with bcrypt password hashing.
- **Role-based Access Control (RBAC)**: Secure middleware gating Admin routes from standard users.

---

## 📝 License
MIT License - Feel free to use this project for learning and development.

---

Built with ❤️ by **Anurag Mishra**. Transforming Feedback into Actionable Insights! 🚀

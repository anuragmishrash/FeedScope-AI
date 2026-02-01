# FeedScope AI

🚀 **Smart Feedback Insight & Sentiment Analysis System**

A production-grade MERN web application with AI-powered sentiment analysis, multilingual support (Hindi & English), voice input, and comprehensive admin analytics dashboard.

---

## ✨ Features

### 🎯 Core Features
- **AI Sentiment Analysis** - HuggingFace Transformers (DistilBERT) for accurate sentiment detection
- **Multilingual Support** - English & Hindi with automatic translation
- **Voice Input** - Speech-to-text feedback submission
- **Emotion Detection** - AI-powered emotion classification
- **Category Prediction** - Automatic feedback categorization
- **Spam Detection** - Rate limiting and duplicate detection
- **Priority Management** - Auto-flagging of critical feedback

### 📊 Admin Dashboard
- **Real-time Analytics** - KPI cards, charts, and trends
- **Advanced Filters** - Search, date range, sentiment, category, priority, status
- **Data Visualization** - Pie charts, bar charts, line graphs (Recharts)
- **Export Functionality** - CSV and PDF report generation
- **Feedback Management** - Status updates, response suggestions
- **Critical Alerts** - Immediate notification of urgent issues

### 🎨 Premium UI/UX
- **Glassmorphism Design** - Modern, premium aesthetic
- **Smooth Animations** - Framer Motion transitions
- **Responsive Layout** - Mobile, tablet, desktop optimized
- **Dark Theme** - Easy on the eyes

---

## 🛠️ Technology Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- Recharts
- Lucide Icons
- React Hot Toast

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs

### AI/ML
- Python FastAPI
- HuggingFace Transformers
- PyTorch
- Google Translate API

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas account (or local MongoDB)

### 1. Clone Repository
```bash
cd "c:\FeedScope AI"
```

### 2. Setup Python Sentiment Microservice
```bash
cd sentiment-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
# Service runs on http://127.0.0.1:8001
```

### 3. Setup Backend (Express Server)
```bash
cd ..\server

# Install dependencies
npm install

# Configure environment variables (already created in .env)
# Make sure MongoDB URI is correct

# Run server
npm run dev
# Server runs on http://localhost:5000
```

### 4. Setup Frontend (React Client)
```bash
cd ..\client

# Install dependencies
npm install

# Run development server
npm run dev
# App runs on http://localhost:3000
```

---

## 🚀 Running the Application

You need to run all 3 services simultaneously:

**Terminal 1** - Python Sentiment Service:
```bash
cd sentiment-service
venv\Scripts\activate
python main.py
```

**Terminal 2** - Express Backend:
```bash
cd server
npm run dev
```

**Terminal 3** - React Frontend:
```bash
cd client
npm run dev
```

Then open your browser and navigate to: **http://localhost:3000**

---

## 👤 Admin Credentials

**Email:** itsanuragmishra99@gmail.com  
**Password:** 987654321Anu

*Note: The admin user is automatically created when the backend starts for the first time.*

---

## 📁 Project Structure

```
FeedScope AI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # Auth context
│   │   ├── utils/          # Helper functions
│   │   └── index.css       # Global styles
│   ├── package.json
│   └── vite.config.js
├── server/                 # Express backend
│   ├── src/
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── server.js       # Main server file
│   ├── .env                # Environment variables
│   └── package.json
└── sentiment-service/      # Python AI microservice
    ├── main.py             # FastAPI application
    ├── requirements.txt
    └── README.md
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Feedback
- `POST /api/feedback` - Submit feedback (public)
- `GET /api/feedback` - Get all feedback with filters (admin)
- `GET /api/feedback/stats` - Get statistics (admin)
- `GET /api/feedback/trends` - Get trends (admin)
- `PATCH /api/feedback/:id/status` - Update status (admin)

### Export
- `GET /api/export/csv` - Export as CSV (admin)
- `POST /api/export/pdf` - Generate PDF report (admin)

---

## 🌐 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
PORT=5000
SENTIMENT_SERVICE_URL=http://127.0.0.1:8001
NODE_ENV=development
```

---

## 🎯 Key Features Explained

### 1. AI Sentiment Analysis
- Uses HuggingFace DistilBERT model fine-tuned for sentiment
- Returns: POSITIVE/NEGATIVE with confidence score
- Maps to 5-level system: Very Positive, Positive, Neutral, Negative, Very Negative
- Neutral threshold: confidence < 65%

### 2. Multilingual Support
- Users can submit feedback in Hindi or English
- Hindi text is automatically translated to English for analysis
- Both original and translated text are stored
- Admin can toggle between original and translated views

### 3. Voice Input
- Uses browser Web Speech API
- Supports both English (en-IN) and Hindi (hi-IN)
- Real-time transcription display
- Seamlessly integrates with text input

### 4. Spam Detection
- Rate limiting: Max 3 submissions per minute per email
- Duplicate detection: 90%+ text similarity check
- Flagged feedback displayed with warnings

### 5. Critical Feedback System
- Auto-flags based on:
  - Very Negative sentiment
  - Angry/Frustrated emotions
  - Rating ≤ 2
- Dashboard alert widget for immediate attention

---

## 📊 Dashboard Analytics

- **KPI Cards:** Total feedback, Average rating, Critical count, Positive rate
- **Charts:**
  - Sentiment Distribution (Pie Chart)
  - Category Breakdown (Bar Chart)
  - Sentiment Trend Over Time (Line Chart)
- **Filters:** Sentiment, Category, Date range, Priority, Status, Language
- **Search:** Full-text search in feedback and email
- **Export:** CSV (all data) and PDF (summary report)

---

## 🎨 UI Highlights

- **Glassmorphism cards** with backdrop blur
- **Gradient backgrounds** and smooth transitions
- **Framer Motion animations** for delightful UX
- **Responsive design** for all screen sizes
- **Custom scrollbars** and hover effects
- **Toast notifications** for user feedback

---

## 🔒 Security

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control (user/admin)
- Rate limiting on API endpoints
- CORS and Helmet security headers

---

## 🐛 Troubleshooting

### Sentiment service not connecting
- Make sure Python service is running on port 8001
- Check firewall settings
- Verify `SENTIMENT_SERVICE_URL` in .env

### MongoDB connection failed
- Verify MongoDB URI in .env
- Check network/firewall
- Ensure MongoDB Atlas IP whitelist includes your IP

### Voice input not working
- Requires HTTPS (or localhost for development)
- Check browser compatibility (Chrome, Edge recommended)
- Grant microphone permissions

---

## 📝 License

MIT License - Feel free to use this project for learning and development.

---

## 🙏 Credits

Built with ❤️ using modern web technologies

- **AI/ML:** HuggingFace Transformers
- **Frontend:** React, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, MongoDB
- **Charts:** Recharts

---

## 📧 Support

For issues or questions, please contact the development team.

---

**FeedScope AI** - Transforming Feedback into Actionable Insights 🚀

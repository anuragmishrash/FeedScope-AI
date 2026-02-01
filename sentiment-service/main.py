"""
FeedScope AI - Sentiment Analysis Microservice
FastAPI service with HuggingFace Transformers for sentiment analysis
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from transformers import pipeline
import torch
import logging
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FeedScope AI Sentiment Service",
    description="HuggingFace Transformer-based sentiment analysis API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global sentiment analyzer (loaded once at startup)
sentiment_analyzer = None


class SentimentRequest(BaseModel):
    """Request model for sentiment analysis"""
    text: str

    @validator('text')
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        return v


class SentimentResponse(BaseModel):
    """Response model for sentiment analysis"""
    label: str
    confidence: float


@app.on_event("startup")
async def load_model():
    """Load HuggingFace model once at startup"""
    global sentiment_analyzer
    try:
        logger.info("Loading HuggingFace sentiment model...")
        
        # Load the distilbert sentiment model
        # This model is optimized for sentiment analysis (POSITIVE/NEGATIVE)
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=0 if torch.cuda.is_available() else -1  # Use GPU if available
        )
        
        logger.info("✅ Model loaded successfully!")
        logger.info(f"Using device: {'GPU' if torch.cuda.is_available() else 'CPU'}")
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
        raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "FeedScope AI Sentiment Service",
        "status": "running",
        "model": "distilbert-base-uncased-finetuned-sst-2-english",
        "ready": sentiment_analyzer is not None
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    if sentiment_analyzer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "status": "healthy",
        "model_loaded": True,
        "device": "GPU" if torch.cuda.is_available() else "CPU"
    }


@app.post("/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of input text
    
    Returns:
        - label: POSITIVE or NEGATIVE
        - confidence: Float between 0 and 1
    """
    if sentiment_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="Sentiment model not loaded. Please wait for initialization."
        )
    
    try:
        # Truncate text if too long (model has 512 token limit)
        text = request.text[:512]
        
        # Analyze sentiment
        result = sentiment_analyzer(text)[0]
        
        logger.info(f"Analyzed: '{text[:50]}...' -> {result['label']} ({result['score']:.2f})")
        
        return SentimentResponse(
            label=result['label'],
            confidence=round(result['score'], 4)
        )
        
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sentiment analysis failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )

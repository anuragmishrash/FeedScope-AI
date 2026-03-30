"""
FeedScope AI - Sentiment Analysis Microservice
FastAPI service with HuggingFace Transformers for multilingual sentiment analysis.

Model: cardiffnlp/twitter-xlm-roberta-base-sentiment
- Supports 100+ languages including Hindi and English
- Trained on Twitter data — handles informal language, slang, emojis
- Output: POSITIVE, NEGATIVE, NEUTRAL with confidence score
- Superior negation handling vs distilbert-sst2 (English-only)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import logging
import re
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FeedScope AI Sentiment Service",
    description="Multilingual HuggingFace Transformer-based sentiment analysis API (Hindi + English + emoji)",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global sentiment analyzer (loaded once at startup)
sentiment_analyzer = None

# Label mapping from XLM-RoBERTa output to our standard
# The model outputs: "positive", "negative", "neutral" (lowercase)
LABEL_MAP = {
    "positive": "POSITIVE",
    "negative": "NEGATIVE",
    "neutral": "NEUTRAL",
    # also handle old distilbert format just in case
    "POSITIVE": "POSITIVE",
    "NEGATIVE": "NEGATIVE",
    "LABEL_0": "NEGATIVE",
    "LABEL_1": "NEUTRAL",
    "LABEL_2": "POSITIVE",
}


class SentimentRequest(BaseModel):
    """Request model for sentiment analysis"""
    text: str

    @validator('text')
    def text_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        return v.strip()


class SentimentResponse(BaseModel):
    """Response model for sentiment analysis"""
    label: str       # POSITIVE | NEGATIVE | NEUTRAL
    confidence: float


def preprocess_text(text: str) -> str:
    """
    Light preprocessing to improve model accuracy.
    - Normalize whitespace
    - Preserve emojis (the model handles them)
    - Preserve Hindi characters
    - Truncate to 512 chars max
    """
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Truncate (model max is 512 tokens; ~512 chars is a safe proxy)
    return text[:512]


@app.on_event("startup")
async def load_model():
    """Load HuggingFace multilingual model once at startup"""
    global sentiment_analyzer
    try:
        model_name = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
        logger.info(f"Loading multilingual sentiment model: {model_name}")
        logger.info("This supports Hindi, English, emojis, and 100+ languages.")

        device = 0 if torch.cuda.is_available() else -1
        sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model=model_name,
            tokenizer=model_name,
            device=device,
            return_all_scores=False,  # only top label
        )

        logger.info("✅ Multilingual sentiment model loaded successfully!")
        logger.info(f"Using device: {'GPU' if torch.cuda.is_available() else 'CPU'}")

    except Exception as e:
        logger.error(f"❌ Failed to load multilingual model: {str(e)}")
        # Fallback: try loading the original distilbert model
        try:
            logger.info("Attempting fallback to distilbert-base-uncased-finetuned-sst-2-english...")
            sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=0 if torch.cuda.is_available() else -1
            )
            logger.info("✅ Fallback model loaded (English-only, limited Hindi/negation support)")
        except Exception as e2:
            logger.error(f"❌ Fallback model also failed: {str(e2)}")
            raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "FeedScope AI Sentiment Service",
        "status": "running",
        "model": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
        "languages": "Hindi + English + 100+ languages",
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
        "device": "GPU" if torch.cuda.is_available() else "CPU",
        "model": "cardiffnlp/twitter-xlm-roberta-base-sentiment"
    }


@app.post("/analyze", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of input text.
    Supports Hindi, English, mixed language, emojis.

    Returns:
        - label: POSITIVE | NEGATIVE | NEUTRAL
        - confidence: Float between 0 and 1
    """
    if sentiment_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="Sentiment model not loaded. Please wait for initialization."
        )

    try:
        text = preprocess_text(request.text)
        result = sentiment_analyzer(text)[0]

        raw_label = result.get("label", "NEUTRAL")
        confidence = round(result.get("score", 0.5), 4)

        # Normalize label to uppercase standard
        normalized_label = LABEL_MAP.get(raw_label, raw_label.upper())

        logger.info(f"Analyzed: '{text[:60]}' -> {normalized_label} ({confidence:.3f})")

        return SentimentResponse(
            label=normalized_label,
            confidence=confidence
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

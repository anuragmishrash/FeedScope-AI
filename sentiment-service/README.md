# FeedScope AI - Sentiment Analysis Microservice

Python FastAPI service with HuggingFace Transformers for sentiment analysis.

## Setup

1. **Create Virtual Environment:**
```bash
python -m venv venv
```

2. **Activate Virtual Environment:**

Windows:
```bash
venv\Scripts\activate
```

Mac/Linux:
```bash
source venv/bin/activate
```

3. **Install Dependencies:**
```bash
pip install -r requirements.txt
```

## Run Service

```bash
python main.py
```

Or:
```bash
uvicorn main:app --reload --port 8001
```

The service will be available at: `http://127.0.0.1:8001`

## API Documentation

Once running, view interactive docs at:
- Swagger UI: `http://127.0.0.1:8001/docs`
- ReDoc: `http://127.0.0.1:8001/redoc`

## API Endpoints

### POST /analyze
Analyze sentiment of text

**Request:**
```json
{
  "text": "This product is amazing!"
}
```

**Response:**
```json
{
  "label": "POSITIVE",
  "confidence": 0.9998
}
```

## Docker (Optional)

```bash
docker build -t feedscope-sentiment .
docker run -p 8001:8001 feedscope-sentiment
```

## Model Information

- **Model:** distilbert-base-uncased-finetuned-sst-2-english
- **Type:** HuggingFace Transformer
- **Output:** POSITIVE or NEGATIVE with confidence score
- **GPU Support:** Automatically uses GPU if available

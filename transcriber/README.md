# Whisper Transcription Microservice

FastAPI microservice for local audio/video transcription using `faster-whisper` (CTranslate2 reimplementation).

## Environment Variables

- `WHISPER_MODEL`: Model to use (default: `large-v3`). Options: `tiny`, `small`, `medium`, `large-v3`.
- `WHISPER_DEVICE`: Device to use (default: `auto`). Options: `cpu`, `cuda`, `auto`.
- `WHISPER_COMPUTE_TYPE`: Compute type (default: `auto`). Options: `default`, `int8`, `int8_float32`, `float32`.

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "model": "large-v3"
}
```

### POST /transcribe
Transcribe audio or video file.

**Request:**
- `file`: Audio/video file (multipart form-data)
- `language`: Language code (default: `pt` for Portuguese)

**Response:**
```json
{
  "text": "Full transcription text...",
  "segments": [
    {
      "startMs": 0,
      "endMs": 5000,
      "text": "First segment..."
    }
  ],
  "durationSeconds": 120.5,
  "language": "pt",
  "languageProbability": 0.95
}
```

## Running

### Local (Python)
```bash
pip install -r requirements.txt
python main.py
```

Server runs on `http://localhost:8000`

### Docker
```bash
docker build -t whisper-transcriber .
docker run -p 8000:8000 whisper-transcriber
```

### Docker Compose
```yaml
transcriber:
  build: ./transcriber
  ports:
    - "8001:8000"
  environment:
    WHISPER_MODEL: large-v3
    WHISPER_DEVICE: auto
```

## Supported Formats

Supports any audio/video format supported by FFmpeg (MP3, WAV, MP4, OGG, FLAC, etc.)

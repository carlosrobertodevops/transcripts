from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
import os
from faster_whisper import WhisperModel
import tempfile

app = FastAPI()

# Configuration from environment variables
MODEL_NAME = os.getenv("WHISPER_MODEL", "large-v3")
DEVICE = os.getenv("WHISPER_DEVICE", "auto")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "auto")

# Load model on startup
model = None

@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading Whisper model: {MODEL_NAME}")
    model = WhisperModel(MODEL_NAME, device=DEVICE, compute_type=COMPUTE_TYPE)
    print(f"Model loaded successfully")

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("pt")):
    """
    Transcribe audio or video file.

    Args:
        file: Audio/video file (MP3, WAV, MP4, etc.)
        language: Language code (default: "pt" for Portuguese)

    Returns:
        JSON with transcription text, segments, duration, language, and confidence
    """
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True
        )

        # Convert segments to list with millisecond timestamps
        segments_list = []
        for segment in segments:
            segments_list.append({
                "startMs": int(segment.start * 1000),
                "endMs": int(segment.end * 1000),
                "text": segment.text.strip()
            })

        # Cleanup
        os.unlink(tmp_path)

        return JSONResponse({
            "text": " ".join([s["text"] for s in segments_list]),
            "segments": segments_list,
            "durationSeconds": info.duration,
            "language": info.language,
            "languageProbability": info.language_probability
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

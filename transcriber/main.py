from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
import os
from faster_whisper import WhisperModel
import tempfile
from prometheus_fastapi_instrumentator import Instrumentator
import json

app = FastAPI()

# Configuration from environment variables
MODEL_NAME = os.getenv("WHISPER_MODEL", "large-v3")
DEVICE = os.getenv("WHISPER_DEVICE", "auto")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "auto")
CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", "0"))  # 0 = auto
BEAM_SIZE = int(os.getenv("WHISPER_BEAM_SIZE", "1"))
NUM_WORKERS = int(os.getenv("WHISPER_NUM_WORKERS", "1"))
VAD_FILTER = os.getenv("WHISPER_VAD_FILTER", "true").lower() in ("true", "1", "yes")

# Load model on startup
model = None

@app.on_event("startup")
async def load_model():
    global model
    print(f"Loading Whisper model: {MODEL_NAME}")
    print(f"Config: device={DEVICE}, compute_type={COMPUTE_TYPE}, cpu_threads={CPU_THREADS}, "
          f"beam_size={BEAM_SIZE}, num_workers={NUM_WORKERS}, vad_filter={VAD_FILTER}")

    model_kwargs = {
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
    }
    if CPU_THREADS > 0:
        model_kwargs["cpu_threads"] = CPU_THREADS
    if NUM_WORKERS > 1:
        model_kwargs["num_workers"] = NUM_WORKERS

    model = WhisperModel(MODEL_NAME, **model_kwargs)
    print(f"Model loaded successfully")

# Prometheus instrumentation exposes /metrics
Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "cpu_threads": CPU_THREADS,
        "beam_size": BEAM_SIZE,
        "num_workers": NUM_WORKERS,
        "vad_filter": VAD_FILTER,
        "ready": model is not None,
    }

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("pt")):
    """
    Transcribe audio or video file (bulk response).

    Args:
        file: Audio/video file (MP3, WAV, MP4, etc.)
        language: Language code (default: "pt" for Portuguese)

    Returns:
        JSON with transcription text, segments, duration, language, and confidence
    """
    tmp_path = None
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Transcribe with parameterized settings
        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=BEAM_SIZE,
            vad_filter=VAD_FILTER
        )

        # Convert segments to list with millisecond timestamps
        segments_list = []
        for segment in segments:
            segments_list.append({
                "startMs": int(segment.start * 1000),
                "endMs": int(segment.end * 1000),
                "text": segment.text.strip()
            })

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
    finally:
        # Cleanup temp file
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@app.post("/transcribe/stream")
async def transcribe_stream(file: UploadFile = File(...), language: str = Form("pt")):
    """
    Transcribe audio or video file with streaming NDJSON response.

    Returns newline-delimited JSON:
    {"type":"meta","language":"pt","durationSeconds":60.5}
    {"type":"segment","startMs":0,"endMs":2500,"text":"Hello"}
    ...
    {"type":"done"}

    Args:
        file: Audio/video file (MP3, WAV, MP4, etc.)
        language: Language code (default: "pt" for Portuguese)

    Returns:
        StreamingResponse with NDJSON format
    """
    # Read upload BEFORE returning StreamingResponse.
    # FastAPI closes UploadFile after handler returns; reading it lazily inside
    # the async generator raises "I/O operation on closed file".
    tmp_path = None
    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                tmp.write(chunk)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp_path = tmp.name
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        return JSONResponse(
            status_code=400,
            content={"error": f"Failed to read upload: {str(e)}"}
        )
    finally:
        try:
            await file.close()
        except Exception:
            pass

    async def stream_generator(path: str):
        try:
            segments, info = model.transcribe(
                path,
                language=language,
                beam_size=BEAM_SIZE,
                vad_filter=VAD_FILTER
            )

            yield json.dumps({
                "type": "meta",
                "language": info.language,
                "durationSeconds": info.duration,
                "languageProbability": info.language_probability
            }) + "\n"

            for segment in segments:
                yield json.dumps({
                    "type": "segment",
                    "startMs": int(segment.start * 1000),
                    "endMs": int(segment.end * 1000),
                    "text": segment.text.strip()
                }) + "\n"

            yield json.dumps({"type": "done"}) + "\n"

        except Exception as e:
            yield json.dumps({
                "type": "error",
                "error": str(e)
            }) + "\n"
        finally:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

    return StreamingResponse(
        stream_generator(tmp_path),
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

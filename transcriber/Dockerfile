# syntax=docker/dockerfile:1.7
# Transcriber — FastAPI + faster-whisper.
# Build args:
#   WHISPER_MODEL=tiny|base|small|medium|large-v3
#     EasyPanel VPS ARM 4GB → tiny
#     Local dev            → base
#   PRE_BAKE_MODEL=true|false (default true) — embeds model in image for cold-boot resilience.
ARG PYTHON_VERSION=3.11
ARG WHISPER_MODEL=tiny
ARG PRE_BAKE_MODEL=true
ARG HF_HOME=/root/.cache/huggingface

FROM python:${PYTHON_VERSION}-slim AS base
ARG HF_HOME
ENV HF_HOME=${HF_HOME} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=0 \
    OMP_NUM_THREADS=3
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends -o APT::Keep-Downloaded-Packages=false \
    ffmpeg ca-certificates curl tini && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives /var/cache/apt/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Pre-bake model into image (toggle via build arg PRE_BAKE_MODEL=false to skip).
# Volume `transcriber_cache:/root/.cache/huggingface` no compose ainda persiste downloads
# adicionais entre restarts caso WHISPER_MODEL mude em runtime.
FROM base AS model-cache
ARG WHISPER_MODEL
ARG PRE_BAKE_MODEL
RUN if [ "$PRE_BAKE_MODEL" = "true" ]; then \
      python -c "from faster_whisper import WhisperModel; \
      WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')"; \
    fi

FROM base AS runtime
ARG HF_HOME
COPY --from=model-cache ${HF_HOME} ${HF_HOME}
COPY main.py .

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=10 \
  CMD curl -fsS http://localhost:8000/health || exit 1
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

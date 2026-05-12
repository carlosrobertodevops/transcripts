export interface TranscriptionSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  durationSeconds: number;
}

export interface TranscriptionProvider {
  name: string;
  transcribe(absFilePath: string, lang?: string): Promise<TranscriptionResult>;
  transcribeStream?(absFilePath: string, lang?: string): AsyncIterable<TranscriptionSegment>;
}

interface RawSegment {
  start?: number;
  end?: number;
  startMs?: number;
  endMs?: number;
  text?: string;
}

const segmentsFromRaw = (raw: RawSegment[] | undefined): TranscriptionSegment[] => {
  if (!raw) return [];
  return raw.map((seg) => ({
    startMs: typeof seg.startMs === "number" ? seg.startMs : Math.round((seg.start ?? 0) * 1000),
    endMs: typeof seg.endMs === "number" ? seg.endMs : Math.round((seg.end ?? 0) * 1000),
    text: seg.text ?? "",
  }));
};

export class GroqProvider implements TranscriptionProvider {
  name = "groq";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || "";
  }

  async transcribe(absFilePath: string, lang: string = "pt"): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("Missing GROQ_API_KEY environment variable");
    }
    const file = Bun.file(absFilePath);
    const formData = new FormData();
    formData.append("file", file as unknown as Blob);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "verbose_json");
    formData.append("language", lang);
    formData.append("temperature", "0");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      text?: string;
      segments?: RawSegment[];
      duration?: number;
    };
    return {
      text: data.text || "",
      segments: segmentsFromRaw(data.segments),
      durationSeconds: data.duration || 0,
    };
  }
}

export class OpenAIProvider implements TranscriptionProvider {
  name = "openai";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
  }

  async transcribe(absFilePath: string, lang: string = "pt"): Promise<TranscriptionResult> {
    if (!this.apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const file = Bun.file(absFilePath);
    const formData = new FormData();
    formData.append("file", file as unknown as Blob);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("language", lang);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      text?: string;
      segments?: RawSegment[];
      duration?: number;
    };
    return {
      text: data.text || "",
      segments: segmentsFromRaw(data.segments),
      durationSeconds: data.duration || 0,
    };
  }
}

export class LocalWhisperProvider implements TranscriptionProvider {
  name = "local";
  private transcriberUrl: string;

  constructor() {
    this.transcriberUrl = process.env.TRANSCRIBER_URL || "";
  }

  private buildFormData(absFilePath: string, lang: string): FormData {
    const file = Bun.file(absFilePath);
    const filename = absFilePath.split("/").pop() ?? "audio";
    const formData = new FormData();
    formData.append("file", file as unknown as Blob, filename);
    formData.append("language", lang);
    return formData;
  }

  async transcribe(absFilePath: string, lang: string = "pt"): Promise<TranscriptionResult> {
    if (!this.transcriberUrl) {
      throw new Error("Missing TRANSCRIBER_URL environment variable");
    }

    const url = this.transcriberUrl.replace(/\/$/, "") + "/transcribe";
    const response = await fetch(url, {
      method: "POST",
      body: this.buildFormData(absFilePath, lang),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Local transcriber error ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as {
      text?: string;
      segments?: RawSegment[];
      durationSeconds?: number;
    };

    return {
      text: data.text || "",
      segments: segmentsFromRaw(data.segments),
      durationSeconds: data.durationSeconds || 0,
    };
  }

  async *transcribeStream(
    absFilePath: string,
    lang: string = "pt",
  ): AsyncIterable<TranscriptionSegment> {
    if (!this.transcriberUrl) {
      throw new Error("Missing TRANSCRIBER_URL environment variable");
    }

    const url = this.transcriberUrl.replace(/\/$/, "") + "/transcribe/stream";
    const response = await fetch(url, {
      method: "POST",
      body: this.buildFormData(absFilePath, lang),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Local transcriber stream error ${response.status}: ${detail}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx = buffer.indexOf("\n");
      while (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (line) {
          const obj = JSON.parse(line) as {
            type: string;
            startMs?: number;
            endMs?: number;
            text?: string;
            error?: string;
          };
          if (obj.type === "segment") {
            yield {
              startMs: obj.startMs ?? 0,
              endMs: obj.endMs ?? 0,
              text: obj.text ?? "",
            };
          } else if (obj.type === "error") {
            throw new Error(`Transcriber stream error: ${obj.error ?? "unknown"}`);
          } else if (obj.type === "done") {
            return;
          }
        }
        newlineIdx = buffer.indexOf("\n");
      }
    }
  }
}

const createProvider = (name: string): TranscriptionProvider => {
  switch (name) {
    case "groq":
      return new GroqProvider();
    case "openai":
      return new OpenAIProvider();
    case "local":
      return new LocalWhisperProvider();
    default:
      throw new Error(`Unknown transcription provider: ${name}`);
  }
};

export const getProvider = (): TranscriptionProvider => {
  const explicit = process.env.TRANSCRIPTION_PROVIDER;
  if (explicit) return createProvider(explicit);

  if (process.env.TRANSCRIBER_URL) return new LocalWhisperProvider();
  if (process.env.GROQ_API_KEY) return new GroqProvider();
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();

  throw new Error(
    "No transcription provider configured. Set TRANSCRIPTION_PROVIDER or TRANSCRIBER_URL / GROQ_API_KEY / OPENAI_API_KEY.",
  );
};

export const transcribeWithFallback = async (
  absFilePath: string,
  lang: string = "pt",
): Promise<TranscriptionResult> => {
  const primary = getProvider();
  const fallbackName = process.env.TRANSCRIPTION_PROVIDER_FALLBACK;
  const timeoutMs = Number(process.env.TRANSCRIBER_TIMEOUT_MS ?? 60000);

  const withTimeout = (promise: Promise<TranscriptionResult>): Promise<TranscriptionResult> =>
    Promise.race<TranscriptionResult>([
      promise,
      new Promise<TranscriptionResult>((_, rej) =>
        setTimeout(() => rej(new Error("transcriber_timeout")), timeoutMs),
      ),
    ]);

  try {
    return await withTimeout(primary.transcribe(absFilePath, lang));
  } catch (err) {
    if (!fallbackName || fallbackName === primary.name) {
      throw err;
    }
    console.warn(
      `[transcription] primary=${primary.name} failed (${(err as Error).message}); falling back to ${fallbackName}`,
    );
    const fallback = createProvider(fallbackName);
    return fallback.transcribe(absFilePath, lang);
  }
};

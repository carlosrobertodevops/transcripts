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
}

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
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "verbose_json");
    formData.append("language", lang);
    formData.append("temperature", "0");
    formData.append("timestamp_granularities[]", "segment");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const segments: TranscriptionSegment[] = (data.segments || []).map((seg: any) => ({
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      text: seg.text || "",
    }));

    return {
      text: data.text || "",
      segments,
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
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const segments: TranscriptionSegment[] = (data.segments || []).map((seg: any) => ({
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      text: seg.text || "",
    }));

    return {
      text: data.text || "",
      segments,
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

  async transcribe(absFilePath: string, lang: string = "pt"): Promise<TranscriptionResult> {
    if (!this.transcriberUrl) {
      throw new Error("Missing TRANSCRIBER_URL environment variable");
    }

    const file = Bun.file(absFilePath);
    const filename = absFilePath.split("/").pop() ?? "audio";
    const formData = new FormData();
    formData.append("file", file as unknown as Blob, filename);
    formData.append("language", lang);

    const url = this.transcriberUrl.replace(/\/$/, "") + "/transcribe";
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Local transcriber error ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as {
      text: string;
      segments: Array<{ startMs: number; endMs: number; text: string }>;
      durationSeconds: number;
    };
    const segments: TranscriptionSegment[] = (data.segments || []).map((seg) => ({
      startMs: seg.startMs,
      endMs: seg.endMs,
      text: seg.text || "",
    }));

    return {
      text: data.text || "",
      segments,
      durationSeconds: data.durationSeconds || 0,
    };
  }
}

export function getProvider(): TranscriptionProvider {
  if (process.env.TRANSCRIBER_URL) {
    return new LocalWhisperProvider();
  }

  if (process.env.GROQ_API_KEY) {
    return new GroqProvider();
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  throw new Error("No transcription provider configured. Set TRANSCRIBER_URL, GROQ_API_KEY, or OPENAI_API_KEY.");
}

import { NextResponse } from "next/server";

const PRIMARY_MODEL = "gpt-4o-mini-transcribe";
const FALLBACK_MODEL = "whisper-1";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Request must include audio blob under 'audio'." },
        { status: 400 }
      );
    }

    const models = Array.from(
      new Set([
        process.env.OPENAI_STT_MODEL ?? PRIMARY_MODEL,
        FALLBACK_MODEL,
      ])
    );

    const errors: { model: string; status: number; body: string }[] = [];

    for (const model of models) {
      const transcriptionForm = new FormData();
      const fileName = audioFile instanceof File ? audioFile.name : "command.webm";
      transcriptionForm.append("file", audioFile, fileName);
      transcriptionForm.append("model", model);
      transcriptionForm.append("response_format", "text");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: transcriptionForm,
        }
      );

      if (response.ok) {
        const transcriptText = (await response.text()).trim();
        return NextResponse.json({ text: transcriptText, modelUsed: model });
      }

      const errorBody = await response.text();
      errors.push({ model, status: response.status, body: errorBody });
    }

    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        attempts: errors,
      },
      {
        status: errors.at(-1)?.status ?? 500,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

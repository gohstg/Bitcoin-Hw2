import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = body?.data ?? [];
    const recent = data.slice(-30);

    if (!recent.length) {
      return NextResponse.json(
        { error: "No indicator data found" },
        { status: 500 }
      );
    }

    const prompt = `
You are a financial dashboard assistant.

Write exactly 3 sentences:
1. Describe the trend in Premium to NAV over the last 30 days.
2. Mention the latest value and whether it indicates a premium or discount.
3. Give one cautious interpretation of what the trend may imply.

Do not give investment advice.

Here is the data:
${JSON.stringify(recent, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return NextResponse.json({
      summary: response.text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
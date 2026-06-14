export const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function unifiedCallLLM(
  apiKey: string,
  model: string,
  messages: LLMMessage[],
  options: { max_tokens?: number, temperature?: number } = {}
): Promise<string> {
  // If key looks like Gemini key (AIza...), route to Gemini API
  if (apiKey.startsWith('AIza')) {
    // Gemini 1.5 format
    // Map system prompt out of messages as it is handled via 'systemInstruction' for gemini-1.5
    const systemMsgs = messages.filter(m => m.role === 'system').map(m => m.content).join('\\n');
    const conversation = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // For gemini, enforce gemini model name
    const geminiModel = model.startsWith('gemini') ? model : 'gemini-1.5-pro-latest';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const body: any = { contents: conversation };
    if (systemMsgs) {
      body.systemInstruction = { parts: [{ text: systemMsgs }] };
    }

    if (options.temperature !== undefined || options.max_tokens !== undefined) {
      body.generationConfig = {};
      if (options.temperature !== undefined) body.generationConfig.temperature = options.temperature;
      if (options.max_tokens !== undefined) body.generationConfig.maxOutputTokens = options.max_tokens;
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? data.error?.message ?? 'No response';
  }

  // Otherwise route to Groq Open-AI compatible API
  const groqModel = model.startsWith('gemini') ? 'llama-3.3-70b-versatile' : model;
  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: groqModel, messages, max_tokens: options.max_tokens, temperature: options.temperature }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? data.error?.message ?? 'No response';
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_MESSAGE_LENGTH = 600;
const MAX_HISTORY = 12;
const MAX_BODY_BYTES = 100_000;
const requestBuckets = new Map();

const instructions = `Você é o BLASCKI AI, assistente do site da BLASCKI. Responda em português do Brasil, com clareza, cordialidade e sem inventar informações. A BLASCKI é apresentada como um estúdio independente de software. NEXUS é descrito no site como um workspace inteligente que transforma informação dispersa em decisões claras. FLOW é descrito como automação silenciosa para processos repetitivos. O site não informa preços, não oferece checkout e não confirma datas de lançamento, disponibilidade, capacidades técnicas ou integrações que não estejam descritas aqui. Quando não souber, diga isso e encaminhe para hello@blascki.com. Você não tem acesso a contas, dados privados, memória persistente, navegação ou ferramentas para executar ações.`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function validateMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_HISTORY) return null;
  const messages = [];
  for (const item of value) {
    if (!item || !["user", "assistant"].includes(item.role)) return null;
    if (typeof item.content !== "string") return null;
    const content = item.content.trim();
    if (!content || content.length > (item.role === "user" ? MAX_MESSAGE_LENGTH : 8000)) return null;
    messages.push({ role: item.role, content });
  }
  return messages[messages.length - 1].role === "user" ? messages : null;
}

function isRateLimited(context) {
  const now = Date.now();
  const ip = context.ip || "unknown";
  for (const [key, bucket] of requestBuckets) {
    if (now - bucket.startedAt >= WINDOW_MS) requestBuckets.delete(key);
  }
  const current = requestBuckets.get(ip);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

function extractText(response) {
  if (!Array.isArray(response.output)) return "";
  return response.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export default async function handleChat(request, context = {}) {
  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ error: "A mensagem ficou grande demais." }, 413);
  }

  let body;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "Pedido grande demais." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }

  const messages = validateMessages(body && body.messages);
  if (!messages) return json({ error: "Mensagem inválida." }, 400);
  if (isRateLimited(context)) {
    return json({ error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente." }, 429);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY secret is not configured");
    return json({ error: "O assistente está indisponível no momento." }, 503);
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        instructions: instructions + " Responda de forma breve, em até 120 palavras.",
        input: messages,
        max_output_tokens: 2048,
        reasoning: { effort: "low" },
        store: false
      })
    });

    if (!upstream.ok) {
      console.error("OpenAI Responses API returned status", upstream.status);
      return json({ error: "O assistente está indisponível no momento." }, 502);
    }

    const response = await upstream.json();
    const reply = extractText(response);
    if (!reply) return json({ error: "O assistente não conseguiu formular uma resposta." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("BLASCKI AI request failed", error && error.name ? error.name : "Error");
    return json({ error: "O assistente está indisponível no momento." }, 502);
  }
}


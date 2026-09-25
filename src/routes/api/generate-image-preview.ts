import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Input = z.object({
  tipo: z.string().min(1).max(100),
  material: z.string().min(1).max(100),
  cor: z.string().min(1).max(100),
  tamanho: z.string().min(1).max(50).optional(),
});

// Template parametrizável do prompt
export function buildProsthesisPrompt(p: z.infer<typeof Input>) {
  return [
    `Renderização 3D fotorrealista de uma prótese ${p.tipo}`,
    `material ${p.material}`,
    `cor ${p.cor}`,
    p.tamanho ? `tamanho ${p.tamanho}` : null,
    "vista em ângulo 3/4, fundo branco neutro, iluminação de estúdio profissional, estilo catálogo médico",
    "apenas o dispositivo isolado, sem pessoas, sem pele, sem texto",
  ]
    .filter(Boolean)
    .join(", ") + ".";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/generate-image-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return json({ error: "A chave da OpenAI ainda não foi configurada." }, 500);
        }

        let params: z.infer<typeof Input>;
        try {
          params = Input.parse(await request.json());
        } catch {
          return json({ error: "Parâmetros da prótese inválidos." }, 400);
        }

        const prompt = buildProsthesisPrompt(params);

        try {
          const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt,
              n: 1,
              size: "1024x1024",
              quality: "medium",
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.error("OpenAI error", res.status, data);
            const msg =
              res.status === 401
                ? "Chave da OpenAI inválida."
                : res.status === 429
                  ? "Limite da OpenAI atingido. Tente novamente em instantes."
                  : data?.error?.message || `Falha na OpenAI (${res.status}).`;
            return json({ error: msg }, res.status);
          }

          const b64 = data?.data?.[0]?.b64_json;
          if (!b64) return json({ error: "A OpenAI não retornou imagem." }, 502);

          return json({ imageUrl: `data:image/png;base64,${b64}`, prompt });
        } catch (e) {
          console.error(e);
          return json({ error: "Não foi possível conectar à OpenAI." }, 502);
        }
      },
    },
  },
});

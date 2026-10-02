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
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return json({ error: "A chave da API do Gemini não foi configurada." }, 500);
        }

        let params: z.infer<typeof Input>;
        try {
          params = Input.parse(await request.json());
        } catch {
          return json({ error: "Parâmetros da prótese inválidos." }, 400);
        }

        const prompt = buildProsthesisPrompt(params);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`;
        
        try {
          const geminiResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });
          
          if (!geminiResponse.ok) {
            const errData = await geminiResponse.json();
            return json({ error: errData.error?.message || "Erro na API Gemini" }, 500);
          }
          
          const data = await geminiResponse.json();
          const part = data.candidates?.[0]?.content?.parts?.[0];
          
          if (part?.inlineData) {
            const b64 = part.inlineData.data;
            const mime = part.inlineData.mimeType || "image/jpeg";
            const imageUrl = `data:${mime};base64,${b64}`;
            return json({ imageUrl, prompt });
          } else {
            return json({ error: "A API não retornou uma imagem." }, 500);
          }
        } catch (e) {
          return json({ error: "Erro ao gerar a imagem 3D com IA." }, 500);
        }
      },
    },
  },
});

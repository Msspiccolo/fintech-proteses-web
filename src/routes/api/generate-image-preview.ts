import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Input = z.object({
  tipo: z.string().min(1).max(100),
  material: z.string().min(1).max(100),
  cor: z.string().min(1).max(100),
  tamanho: z.string().min(1).max(50).optional(),
});

export function buildProsthesisPrompt(p: z.infer<typeof Input>) {
  const typeMap: Record<string, string> = {
    "de braço transradial": "transradial arm",
    "de perna transtibial": "transtibial leg",
    "de mão biônica": "bionic hand",
    "de pé dinâmico": "dynamic foot",
    "de joelho modular": "modular knee",
    "de quadril": "hip"
  };
  const matMap: Record<string, string> = {
    "fibra de carbono": "carbon fiber",
    "titânio aeroespacial": "aerospace titanium",
    "silicone realista": "realistic medical silicone",
    "polímero impresso em 3D": "3D printed high-grade polymer"
  };
  const colorMap: Record<string, string> = {
    "preto fosco com detalhes prateados": "matte black with silver details",
    "branco perolado com detalhes em LED azul": "pearl white with blue LED accents",
    "tom de pele realista": "realistic human skin tone",
    "cromado polido": "highly polished chrome"
  };

  const engType = typeMap[p.tipo] || p.tipo;
  const engMat = matMap[p.material] || p.material;
  const engColor = colorMap[p.cor] || p.cor;

  return [
    `High-quality photorealistic 3D render of a ${engType} prosthesis`,
    `Professional product photography style, highly detailed and realistic`,
    `Material: ${engMat}, showing realistic textures, reflections, and physical properties`,
    `Color and finish: ${engColor}`,
    `Aesthetic: sleek, modern, advanced medical technology, premium quality`,
    `Lighting: dramatic studio lighting, soft box reflections, highlighting the curves and mechanics`,
    `Background: solid dark studio background to make the product stand out`,
    `Highly detailed mechanical joints, realistic proportions, and cinematic 8k resolution render`
  ].join(", ") + ".";
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

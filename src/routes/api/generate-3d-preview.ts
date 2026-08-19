import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-3d-preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { description } = (await request.json()) as { description?: string };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const prompt = `Render fotorrealista de uma prótese ortopédica médica personalizada modelada em 3D pronta para impressão 3D (compatível com arquivo STL). ${description || "Prótese ortopédica personalizada"}. Vista isométrica, fundo branco limpo, materiais em titânio e polímero médico, iluminação de estúdio, alta qualidade, estilo CAD/render técnico premium.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
            stream: true,
          }),
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});

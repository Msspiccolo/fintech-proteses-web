import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { 
            tipo = "perna", 
            material = "fibra de carbono", 
            cor = "preto" 
          } = (await request.json()) as { tipo?: string; material?: string; cor?: string };

          // Prompt descritivo em inglês para melhor qualidade de geração
          const prompt = `A photorealistic 3D render of a ${tipo} prosthesis, made of ${material}, predominant color ${cor}. Modern, technological, elegant and ergonomic medical prosthetic design. Clean white studio photography background with professional lighting. Hyper detailed, 8K quality, product photography style. No text, no labels, no watermarks.`;

          const encodedPrompt = encodeURIComponent(prompt);
          const randomSeed = Math.floor(Math.random() * 1000000);

          // Pollinations.ai: API gratuita de geração de imagens, sem necessidade de chave
          const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}&model=flux`;

          // Faz o download da imagem e converte para base64 data URL
          const imageResponse = await fetch(imageUrl);

          if (!imageResponse.ok) {
            throw new Error(`Erro ao gerar imagem via Pollinations (${imageResponse.status})`);
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(imageBuffer).toString("base64");
          const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

          return new Response(
            JSON.stringify({
              imageUrl: `data:${mimeType};base64,${base64}`,
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error: any) {
          console.error("Erro ao gerar prévia da imagem:", error);
          const errorMessage = error instanceof Error ? error.message : "Falha ao gerar a imagem.";
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-3d-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { description } = (await request.json()) as { description?: string };
        const englishPrompt = `Isolated 3D CAD render of a purely mechanical robotic component. ${description ? description : "High-tech carbon fiber structure"}. Pure white background. Professional industrial product photography. Object only, isolated, no skin, no clothing.`;
        
        let imageUrl = "";

        if (process.env.OPENAI_API_KEY) {
          try {
            const response = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: englishPrompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json",
              }),
            });

            if (!response.ok) {
              const errText = await response.text();
              console.error("OpenAI Error:", response.status, errText);
              throw new Error(`OpenAI API returned ${response.status}`);
            }

            const data = await response.json();
            if (data.data && data.data[0] && data.data[0].b64_json) {
              imageUrl = `data:image/jpeg;base64,${data.data[0].b64_json}`;
            }
          } catch (error) {
            console.error("OpenAI falhou, usando Pollinations:", error);
          }
        }

        if (!imageUrl) {
          // Fallback para Pollinations.ai com negative_prompt MUITO forte
          const encodedPrompt = encodeURIComponent(englishPrompt);
          const negativePrompt = "human, person, hand, arm, leg, body, skin, wearing, attached, face, mannequin, background, messy, text, watermark";
          const encodedNeg = encodeURIComponent(negativePrompt);
          const randomSeed = Math.floor(Math.random() * 1000000);
          // Usando model=flux-3d que é mais adequado para renders
          imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}&model=flux-3d&negative_prompt=${encodedNeg}`;
        }

        // Formato SSE que o frontend (streamImage.ts) espera
        const sseStream = new ReadableStream({
          start(controller) {
            const data = JSON.stringify({
              choices: [{
                finish_reason: "stop",
                delta: {
                  images: [{ url: imageUrl }]
                }
              }]
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
            controller.close();
          }
        });

        return new Response(sseStream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});

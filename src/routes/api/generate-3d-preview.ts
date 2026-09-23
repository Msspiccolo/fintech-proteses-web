import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-3d-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { description } = (await request.json()) as { description?: string };
        const englishPrompt = `High quality 3D CAD render of a medical orthopedic prosthesis on a clean white background. ${description ? description : "High-tech custom prosthetic limb"}. Made of titanium and carbon fiber, studio lighting, professional medical device.`;
        
        let imageUrl = "";

        if (process.env.GEMINI_API_KEY) {
          // Use Gemini API (Imagen 3) if key is available
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-images:predict?key=${process.env.GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  instances: [{ prompt: englishPrompt }],
                  parameters: { sampleCount: 1, outputOptions: { mimeType: "image/jpeg" } },
                }),
              }
            );
            if (!response.ok) {
              const errText = await response.text();
              console.error("Gemini Image API Error:", errText);
              throw new Error("Gemini Image API failed");
            }
            const data = await response.json();
            const base64Image = data.predictions?.[0]?.bytesBase64Encoded;
            if (base64Image) {
              imageUrl = `data:image/jpeg;base64,${base64Image}`;
            }
          } catch (error) {
            console.error("Failed to use Gemini API, falling back to Pollinations", error);
          }
        }

        if (!imageUrl) {
          // Fallback to Pollinations.ai if Gemini fails or key is not provided
          const encodedPrompt = encodeURIComponent(englishPrompt);
          const randomSeed = Math.floor(Math.random() * 1000000);
          imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}&model=flux`;
        }

        // Simula o formato Server-Sent Events (SSE) que o frontend (streamImage.ts) espera
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

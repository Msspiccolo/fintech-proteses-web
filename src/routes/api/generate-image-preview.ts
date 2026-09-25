import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-image-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const {
            tipo = "prótese ortopédica",
            material = "fibra de carbono",
            cor = "preto",
          } = (await request.json()) as { tipo?: string; material?: string; cor?: string };

          // Mapeamento de tipo de prótese → descrição 3D detalhada em inglês
          // Mapeamento de tipo de prótese → descrição puramente mecânica (para enganar a IA e evitar partes humanas)
          const tipoMap: Record<string, string> = {
            "Joelho Modulares":
              "mechanical hinge joint component, titanium pivot, polymer bearing sleeve, metal bracket connectors, industrial robotics part",
            "Quadril Anatômico Biolox  Delta":
              "spherical ceramic ball joint on titanium stem implant, porous metal surface, biomedical engineering component",
            "Perna Transtibial L1 ao L3":
              "tubular carbon fiber shaft pylon, socket cup mount on top, universal pyramid adapter at bottom, robotics structural part",
            "Pé Dinâmico Direito":
              "dynamic energy-return carbon fiber blade spring, split-toe design, mechanical suspension component",
            "Mão Biônica completa":
              "bionic robotic manipulator end-effector, five mechanical digits with visible servo motors and tendon cables, metal housing, purely mechanical machinery",
            "Braço Transradial nível A2":
              "tubular carbon fiber forearm shaft mount, quick-disconnect terminal device adapter, industrial robotic attachment",
          };

          const colorMap: Record<string, string> = {
            "preto": "matte black",
            "branco": "glossy white",
            "cromado": "polished chrome silver",
          };

          const materialMap: Record<string, string> = {
            "fibra de carbono": "carbon fiber composite with visible weave pattern",
            "titânio aeroespacial": "brushed aerospace-grade titanium alloy",
            "silicone realista": "medical-grade translucent silicone",
          };

          const tipoDesc = tipoMap[tipo] ?? `${tipo} prosthetic medical device`;
          const colorEn = colorMap[cor] ?? cor;
          const materialEn = materialMap[material] ?? material;

          const prompt = `Photorealistic 3D CAD render of a ${tipoDesc}. Material: ${materialEn}. Color: ${colorEn}. The prosthetic device is displayed alone on a clean white studio background. Professional medical product photography with soft studio lighting and subtle reflections. High-tech, modern, ergonomic design. Ultra-detailed. Only the prosthetic device is shown, no human body, no person.`;

          let imageUrl = "";
          let source = "pollinations";

          // Tentar OpenAI DALL-E 3
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
                  prompt: prompt,
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
                source = "openai";
              }

              if (!imageUrl) {
                console.error("OpenAI retornou resposta sem imagem:", JSON.stringify(data).slice(0, 500));
                throw new Error("OpenAI não retornou imagem");
              }
            } catch (openaiError) {
              console.error("OpenAI falhou, tentando fallback:", openaiError);
            }
          }

          // Fallback: Pollinations.ai com bloqueios rígidos
          if (!imageUrl) {
            const encodedPrompt = encodeURIComponent(prompt);
            const negativePrompt = "human, person, hand, arm, leg, body, skin, face, mannequin, wearing, attached, background pattern, messy, text, watermark, logo";
            const encodedNeg = encodeURIComponent(negativePrompt);
            const randomSeed = Math.floor(Math.random() * 1000000);
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}&model=flux-3d&negative_prompt=${encodedNeg}`;

            const imageResponse = await fetch(pollinationsUrl);
            if (!imageResponse.ok) {
              throw new Error(`Pollinations falhou (${imageResponse.status})`);
            }

            const imageBuffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(imageBuffer).toString("base64");
            const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
            imageUrl = `data:${mimeType};base64,${base64}`;
          }

          return new Response(
            JSON.stringify({ imageUrl, source }),
            { headers: { "Content-Type": "application/json" } }
          );
        } catch (error: any) {
          console.error("Erro ao gerar prévia da imagem:", error);
          const errorMessage = error instanceof Error ? error.message : "Falha ao gerar a imagem.";
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});

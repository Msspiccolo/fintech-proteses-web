import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-3d-model")({
  server: {
    handlers: {
      // POST starts the 3D generation task
      POST: async ({ request }: { request: Request }) => {
        const { imageUrl } = (await request.json()) as { imageUrl: string; description?: string };
        const apiKey = process.env.MESHY_API_KEY;

        if (!apiKey || apiKey.startsWith("http")) {
          // Mock mode: immediately return a fake task ID se a chave não estiver configurada corretamente
          return new Response(JSON.stringify({ result: "mock-123" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const response = await fetch("https://api.meshy.ai/v1/image-to-3d", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_url: imageUrl,
              enable_pbr: true,
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Meshy API Error: ${err}`);
          }

          const data = await response.json();
          // data.result contains the task ID
          return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error starting 3D model generation:", error);
          return new Response(JSON.stringify({ error: "Failed to generate 3D model" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      // GET polls the status of the task
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const taskId = url.searchParams.get("taskId");
        const apiKey = process.env.MESHY_API_KEY;

        if (!taskId) {
          return new Response("Missing taskId", { status: 400 });
        }

        if (!apiKey || taskId.startsWith("mock-") || apiKey.startsWith("http")) {
          // Mock mode: simulate success with a placeholder GLB
          return new Response(
            JSON.stringify({
              status: "SUCCEEDED",
              progress: 100,
              model_urls: {
                glb: "https://modelviewer.dev/shared-assets/models/Astronaut.glb",
              },
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          const response = await fetch(`https://api.meshy.ai/v1/image-to-3d/${taskId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Meshy API Error: ${err}`);
          }

          const data = await response.json();
          // Map to standard format
          let frontendStatus = "IN_PROGRESS";
          if (data.status === "SUCCEEDED") frontendStatus = "SUCCEEDED";
          if (data.status === "FAILED") frontendStatus = "FAILED";

          return new Response(JSON.stringify({
            status: frontendStatus,
            progress: data.progress || 50,
            model_urls: {
              glb: data.model_urls?.glb || ""
            }
          }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Error polling 3D model status:", error);
          return new Response(JSON.stringify({ error: "Failed to poll 3D model" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

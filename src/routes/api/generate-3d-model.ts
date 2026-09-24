import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/generate-3d-model")({
  server: {
    handlers: {
      // POST starts the 3D generation task
      POST: async ({ request }: { request: Request }) => {
        const { imageUrl } = (await request.json()) as { imageUrl: string; description?: string };
        const apiKey = process.env.FAL_KEY;

        if (!apiKey) {
          // Mock mode: immediately return a fake task ID se a chave não estiver configurada
          return new Response(JSON.stringify({ result: "mock-123" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          // Send to Fal.ai Queue API (Stable Fast 3D model)
          const response = await fetch("https://queue.fal.run/fal-ai/stable-fast-3d", {
            method: "POST",
            headers: {
              Authorization: `Key ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_url: imageUrl,
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            throw new Error(`Fal.ai API Error: ${err}`);
          }

          const data = await response.json();
          // data.request_id contains the task ID
          return new Response(JSON.stringify({ result: data.request_id }), {
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
        const apiKey = process.env.FAL_KEY;

        if (!taskId) {
          return new Response("Missing taskId", { status: 400 });
        }

        if (!apiKey || taskId.startsWith("mock-")) {
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
          // 1. Get Status
          const statusResponse = await fetch(`https://queue.fal.run/fal-ai/stable-fast-3d/requests/${taskId}/status`, {
            method: "GET",
            headers: {
              Authorization: `Key ${apiKey}`,
            },
          });

          if (!statusResponse.ok) {
            const err = await statusResponse.text();
            throw new Error(`Fal.ai Status API Error: ${err}`);
          }

          const statusData = await statusResponse.json();
          const falStatus = statusData.status; // IN_QUEUE, IN_PROGRESS, COMPLETED

          let frontendStatus = "IN_PROGRESS";
          let progress = 50;
          let glbUrl = "";

          if (falStatus === "IN_QUEUE") progress = 10;
          if (falStatus === "IN_PROGRESS") progress = 50;

          if (falStatus === "COMPLETED") {
            frontendStatus = "SUCCEEDED";
            progress = 100;
            
            // 2. Fetch the actual result
            const resultResponse = await fetch(`https://queue.fal.run/fal-ai/stable-fast-3d/requests/${taskId}`, {
              method: "GET",
              headers: {
                Authorization: `Key ${apiKey}`,
              },
            });
            const resultData = await resultResponse.json();
            glbUrl = resultData?.model_file?.url || resultData?.model_mesh?.url || "";
          }

          return new Response(JSON.stringify({
            status: frontendStatus,
            progress: progress,
            model_urls: {
              glb: glbUrl
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

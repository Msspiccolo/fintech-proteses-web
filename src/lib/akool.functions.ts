import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// NOTA: Endpoint ilustrativo. Atualize com a URL correta da documentação atual da Akool
const AKOOL_API_URL = "https://openapi.akool.com/api/v1/3d/generate";

export const generate3DModelFromAkool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        imageUrl: z.string().url("A imagem precisa ser uma URL válida"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.AKOOL_API_KEY;

    if (!apiKey) {
      throw new Error("Chave da API da Akool (AKOOL_API_KEY) não configurada no servidor. Adicione ao Lovable Cloud.");
    }

    try {
      // Faz a chamada para a API da Akool de forma segura no backend
      const response = await fetch(AKOOL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-api-key": apiKey, // Incluindo ambos para cobrir as opções de autenticação deles
        },
        body: JSON.stringify({
          image_url: data.imageUrl,
          // Outros parâmetros podem ser necessários conforme a documentação
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Akool API Error:", errorText);
        throw new Error(`Erro da Akool: ${response.statusText}`);
      }

      const result = await response.json();
      
      return { ok: true, data: result };
    } catch (error) {
      console.error("Erro na integração com Akool:", error);
      throw new Error(error instanceof Error ? error.message : "Erro desconhecido na API da Akool");
    }
  });

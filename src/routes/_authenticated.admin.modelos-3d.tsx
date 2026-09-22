import { createFileRoute } from '@tanstack/react-router'
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { generate3DModelFromAkool } from "@/lib/akool.functions";
import { ModelViewer } from "@/components/3d-model-viewer";

export const Route = createFileRoute("/_authenticated/admin/modelos-3d")({
  component: Modelos3DPage,
});

function Modelos3DPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const generateModel = useServerFn(generate3DModelFromAkool);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      toast.error("Por favor, insira uma URL de imagem.");
      return;
    }

    setIsGenerating(true);
    setJobId(null);
    
    try {
      // Chama a server function segura para se comunicar com a Akool
      const response = await generateModel({ data: { imageUrl } });
      
      // O comportamento exato depende do que a Akool retorna.
      // Assumindo que ela retorne um model_url ou um job_id:
      if (response.data?.model_url) {
        setModelUrl(response.data.model_url);
        toast.success("Modelo gerado com sucesso!");
      } else if (response.data?.job_id) {
        setJobId(response.data.job_id);
        toast.success("Geração iniciada! Job ID: " + response.data.job_id);
        // Aqui seria implementado um polling para verificar o status do job_id
      } else {
        toast.success("Requisição enviada, verifique os logs.");
        console.log("Resposta da Akool:", response.data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao conectar com a Akool.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Testar Modelos 3D (Akool)</h1>
            <p className="mt-2 text-muted-foreground">
              Faça requisições seguras para a API da Akool e visualize o resultado.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gerar Modelo 3D</CardTitle>
                <CardDescription>
                  Insira a URL de uma imagem para enviar para a API da Akool.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">URL da Imagem</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                  </div>
                  
                  <Button type="submit" disabled={isGenerating} className="w-full">
                    {isGenerating ? "Processando..." : "Gerar com Akool"}
                  </Button>
                </form>

                {jobId && (
                  <div className="mt-6 p-4 rounded-md bg-muted text-sm">
                    <p className="font-semibold">Processamento em Andamento</p>
                    <p className="text-muted-foreground break-all">ID da Tarefa: {jobId}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      (A implementação de polling para verificar este job ainda precisa ser configurada com o endpoint correto da Akool).
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Visualizador</CardTitle>
                <CardDescription>
                  Interaja com o modelo gerado em 3D.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {modelUrl ? (
                  <ModelViewer src={modelUrl} className="flex-1 min-h-[300px]" />
                ) : (
                  <div className="flex-1 min-h-[300px] flex items-center justify-center rounded-xl border border-dashed text-muted-foreground bg-muted/20">
                    <div className="text-center">
                      <p>Nenhum modelo carregado</p>
                      <p className="text-xs mt-1">Gere um modelo para visualizar</p>
                      
                      {/* Botão de teste para ver o componente em ação usando um modelo de exemplo público */}
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => setModelUrl("https://modelviewer.dev/shared-assets/models/Astronaut.glb")}
                      >
                        Carregar modelo de teste
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

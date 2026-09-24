import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wand2, Image as ImageIcon } from "lucide-react";

export function ProsthesisGenerator() {
  const [tipo, setTipo] = useState("braço");
  const [material, setMaterial] = useState("fibra de carbono");
  const [cor, setCor] = useState("preto com detalhes prateados");
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function handleGeneratePreview() {
    setIsGeneratingImage(true);
    setImageUrl(null);
    try {
      const response = await fetch("/api/generate-image-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, material, cor }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao gerar imagem");
      }
      
      setImageUrl(data.imageUrl);
      toast.success("Prévia gerada com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" />
          Gerador Inteligente de Próteses
        </CardTitle>
        <CardDescription>
          Escolha as características da sua prótese e deixe a IA gerar uma prévia hiper-realista.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Coluna 1: Formulário */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tipo de Prótese</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="braço">Braço / Membro Superior</SelectItem>
                  <SelectItem value="perna">Perna / Membro Inferior</SelectItem>
                  <SelectItem value="mão biónica">Mão Biónica</SelectItem>
                  <SelectItem value="pé">Pé Ortopédico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Material Principal</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fibra de carbono">Fibra de Carbono (Leve e Resistente)</SelectItem>
                  <SelectItem value="titânio aeroespacial">Titânio Aeroespacial (Premium)</SelectItem>
                  <SelectItem value="silicone realista">Silicone Realista (Discreto)</SelectItem>
                  <SelectItem value="polímero impresso em 3D">Polímero 3D (Custo-benefício)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cor e Acabamento</Label>
              <Select value={cor} onValueChange={setCor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preto com detalhes prateados">Preto Fosco (Esportivo)</SelectItem>
                  <SelectItem value="branco perolado com detalhes em led azul">Branco com LED Azul (Cyberpunk)</SelectItem>
                  <SelectItem value="tom de pele realista">Tom de Pele Realista</SelectItem>
                  <SelectItem value="cromado polido">Metal Cromado (Industrial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGeneratePreview} 
              disabled={isGeneratingImage}
              className="w-full mt-4"
              size="lg"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                "Gerar Prévia"
              )}
            </Button>
          </div>

          {/* Coluna 2: Resultado Visual */}
          <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed rounded-xl bg-muted/20 relative overflow-hidden group">
            {imageUrl ? (
              <>
                <img 
                  src={imageUrl} 
                  alt="Prévia da Prótese" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="secondary" className="shadow-lg">
                    Transformar em 3D
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground p-6">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Sua prévia aparecerá aqui</p>
                <p className="text-sm mt-1 opacity-70">
                  Clique em gerar para usar o poder do Gemini.
                </p>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

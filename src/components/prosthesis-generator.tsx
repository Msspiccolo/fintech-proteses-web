import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wand2, Image as ImageIcon, Download, RefreshCw, AlertCircle } from "lucide-react";

export function ProsthesisGenerator() {
  const [tipo, setTipo] = useState("de braço transradial");
  const [material, setMaterial] = useState("fibra de carbono");
  const [cor, setCor] = useState("preto fosco com detalhes prateados");
  const [tamanho, setTamanho] = useState("adulto médio");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-image-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, material, cor, tamanho }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao gerar imagem");
      setImageUrl(data.imageUrl);
      toast.success("Imagem 3D gerada!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `protese-3d-${Date.now()}.png`;
    a.click();
  }

  const field = (label: string, value: string, set: (v: string) => void, opts: [string, string][]) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={set}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-primary/20">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" /> Gerador de Imagem 3D
        </CardTitle>
        <CardDescription>Escolha as características e gere uma renderização 3D realista da sua prótese.</CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-5">
            {field("Tipo de prótese", tipo, setTipo, [
              ["de braço transradial", "Braço transradial"],
              ["de perna transtibial", "Perna transtibial"],
              ["de mão biônica", "Mão biônica"],
              ["de pé dinâmico", "Pé dinâmico"],
              ["de joelho modular", "Joelho modular"],
              ["de quadril", "Quadril"],
            ])}
            {field("Material", material, setMaterial, [
              ["fibra de carbono", "Fibra de carbono"],
              ["titânio aeroespacial", "Titânio aeroespacial"],
              ["silicone realista", "Silicone realista"],
              ["polímero impresso em 3D", "Polímero 3D"],
            ])}
            {field("Tamanho", tamanho, setTamanho, [
              ["infantil", "Infantil"],
              ["adulto pequeno", "Adulto P"],
              ["adulto médio", "Adulto M"],
              ["adulto grande", "Adulto G"],
            ])}
            {field("Cor e acabamento", cor, setCor, [
              ["preto fosco com detalhes prateados", "Preto fosco"],
              ["branco perolado com detalhes em LED azul", "Branco com LED azul"],
              ["tom de pele realista", "Tom de pele"],
              ["cromado polido", "Cromado"],
            ])}

            <Button onClick={generate} disabled={loading} className="w-full mt-4" size="lg">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando imagem...</> : "Gerar imagem 3D"}
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-1 items-center justify-center min-h-[300px] border-2 border-dashed rounded-xl bg-muted/20 overflow-hidden">
              {loading ? (
                <div className="text-center text-muted-foreground p-6">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-primary" />
                  <p className="font-medium">Renderizando sua prótese...</p>
                  <p className="text-sm opacity-70">Pode levar até um minuto.</p>
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="Imagem 3D da prótese" className="w-full h-full object-cover" />
              ) : error ? (
                <div className="text-center text-destructive p-6">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3" />
                  <p className="font-medium">Não foi possível gerar a imagem</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sua imagem aparecerá aqui</p>
                </div>
              )}
            </div>
            {imageUrl && !loading && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" /> Baixar</Button>
                <Button variant="outline" onClick={generate}><RefreshCw className="w-4 h-4 mr-2" /> Regenerar</Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

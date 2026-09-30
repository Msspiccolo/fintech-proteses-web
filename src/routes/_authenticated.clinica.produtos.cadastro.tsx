import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/clinica/produtos/cadastro")({
  component: CadastroProduto,
});

function CadastroProduto() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    preco: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let imageUrl = null;
    
    // Simulate upload to Supabase bucket
    if (file) {
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("produtos")
          .upload(`public/${fileName}`, file);
          
        if (!error && data) {
          const { data: publicUrlData } = supabase.storage
            .from("produtos")
            .getPublicUrl(data.path);
          imageUrl = publicUrlData.publicUrl;
        } else {
          // Fallback if bucket doesn't exist
          imageUrl = preview;
        }
      } catch (err) {
        imageUrl = preview;
      }
    }

    const newProduct = {
      id: Date.now().toString(),
      nome: form.nome,
      descricao: form.descricao,
      preco: Number(form.preco),
      imagem: imageUrl,
      created_at: new Date().toISOString()
    };

    // Save to local storage for now
    const existing = JSON.parse(localStorage.getItem("clinica_produtos") || "[]");
    localStorage.setItem("clinica_produtos", JSON.stringify([newProduct, ...existing]));

    setLoading(false);
    toast.success("Produto cadastrado com sucesso!");
    router.navigate({ to: "/clinica/produtos" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/clinica/produtos"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o catálogo
          </Link>
          
          <div className="mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-foreground">Novo Produto</h1>
            <p className="mt-1 text-muted-foreground">
              Cadastre um novo produto ou serviço para disponibilizar para financiamento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 md:p-8 rounded-lg border shadow-sm">
            <div className="space-y-4">
              <Label>Imagem do Produto</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-input bg-muted/50 hover:bg-muted/80 transition-colors">
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ImagePlus size={28} className="mb-2" />
                      <span className="text-xs font-medium">Adicionar</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Upload da imagem</p>
                  <p>A imagem será salva no bucket de armazenamento.</p>
                  <p>Recomendado: 800x800px (Máx. 2MB).</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Produto/Serviço</Label>
              <Input 
                id="nome" 
                value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})}
                placeholder="Ex: Prótese Transfemoral em Fibra de Carbono" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Input 
                id="descricao" 
                value={form.descricao}
                onChange={e => setForm({...form, descricao: e.target.value})}
                placeholder="Breve descrição dos componentes e características" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preco">Valor (R$)</Label>
              <Input 
                id="preco" 
                type="number" 
                step="0.01" 
                min="0" 
                value={form.preco}
                onChange={e => setForm({...form, preco: e.target.value})}
                placeholder="0.00" 
                required 
              />
            </div>

            <div className="pt-4 flex justify-end gap-4 mt-6">
              <Link to="/clinica/produtos">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex items-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {loading ? "Salvando..." : "Salvar Produto"}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

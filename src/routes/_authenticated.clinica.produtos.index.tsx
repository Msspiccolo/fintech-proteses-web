import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { PlusCircle, Box, PackageOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PROSTHESIS_MODELS, Prosthesis3DPreview } from "@/components/prosthesis-3d-preview";

export const Route = createFileRoute("/_authenticated/clinica/produtos/")({
  component: CatalogoProdutos,
});

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  categoria?: string;
  created_at: string;
  is3DModel?: boolean;
}

function CatalogoProdutos() {
  const [produtos, setProdutos] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts() {
      let bucketFiles: any[] = [];
      
      try {
        const { data: rootFiles } = await supabase.storage.from("produtos").list();
        const { data: publicFiles } = await supabase.storage.from("produtos").list("public");
        
        bucketFiles = [
          ...(rootFiles?.map(f => ({ ...f, path: f.name })) || []),
          ...(publicFiles?.map(f => ({ ...f, path: `public/${f.name}` })) || [])
        ].filter(f => f.name && f.name !== ".emptyFolderPlaceholder" && f.name !== "public");
      } catch (err) {
        console.error("Erro ao buscar arquivos do bucket:", err);
      }

      // Fallback images for platform models
      const fallbackImages: Record<string, string> = {
        "knee": "https://images.unsplash.com/photo-1598046937895-2fe94f57a3e5?w=800&auto=format&fit=crop&q=60",
        "hip": "https://images.unsplash.com/photo-1579541592065-ad78e47087bc?w=800&auto=format&fit=crop&q=60",
        "leg": "https://images.unsplash.com/photo-1581594549595-35f6edc7b762?w=800&auto=format&fit=crop&q=60",
        "foot": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=60",
        "hand": "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?w=800&auto=format&fit=crop&q=60",
        "arm": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60",
      };

      // Mapeia os produtos da plataforma (PROSTHESIS_MODELS) e tenta achar imagens no bucket para eles
      const platformProducts: Product[] = PROSTHESIS_MODELS.map(model => {
        // Tenta achar um arquivo no bucket que contenha o ID (ex: knee) ou nome do produto
        const matchingFile = bucketFiles.find(f => 
          f.name.toLowerCase().includes(model.id.toLowerCase()) || 
          f.name.toLowerCase().includes(model.name.toLowerCase())
        );
        
        let imageUrl = null;
        if (matchingFile) {
          imageUrl = supabase.storage.from("produtos").getPublicUrl(matchingFile.path).data.publicUrl;
        }

        return {
          id: model.id,
          nome: model.name,
          descricao: model.description,
          preco: model.basePrice,
          categoria: model.category,
          imagem: imageUrl,
          is3DModel: !imageUrl, // Se não tiver imagem no bucket, usa o modelo 3D
          created_at: new Date().toISOString()
        };
      });

      const saved = JSON.parse(localStorage.getItem("clinica_produtos") || "[]");
      
      // Para os arquivos do bucket que não deram match com nenhum modelo da plataforma, cria produtos genéricos
      const matchedPaths = new Set(platformProducts.map(p => {
        if (!p.imagem) return null;
        // Pega o final da URL para saber o path
        const parts = p.imagem.split('/');
        return parts[parts.length - 1];
      }).filter(Boolean));

      const unmatchedBucketProducts = bucketFiles
        .filter(f => !matchedPaths.has(f.name))
        .map(file => {
          const { data: publicUrlData } = supabase.storage
            .from("produtos")
            .getPublicUrl(file.path);
            
          return {
            id: file.id || file.name,
            nome: file.name.split('.')[0] || "Produto",
            descricao: "Produto recuperado do bucket",
            preco: 0,
            imagem: publicUrlData.publicUrl,
            created_at: file.created_at || new Date().toISOString()
          };
      });

      // Remove duplicados onde a imagem do localStorage já é a mesma do bucket
      const savedImageUrls = new Set(saved.map((s: any) => s.imagem));
      const finalBucketProducts = unmatchedBucketProducts.filter(bp => !savedImageUrls.has(bp.imagem));
      
      setProdutos([...saved, ...platformProducts, ...finalBucketProducts]);
    }

    loadProducts();
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Box className="h-8 w-8 text-primary" />
                Catálogo de Produtos
              </h1>
              <p className="mt-1 text-muted-foreground">
                Gerencie os produtos e serviços oferecidos pela sua clínica.
              </p>
            </div>
            <Link to="/clinica/produtos/cadastro">
              <Button className="flex items-center gap-2">
                <PlusCircle size={18} />
                Novo Produto
              </Button>
            </Link>
          </div>
          
          {produtos.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Box className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Nenhum produto cadastrado</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Você ainda não adicionou nenhum produto ao seu catálogo. Adicione produtos para permitir que seus pacientes simulem financiamentos para eles.
              </p>
              <Link to="/clinica/produtos/cadastro">
                <Button>Cadastrar meu primeiro produto</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {produtos.map((produto) => (
                <div key={produto.id} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md flex flex-col">
                  <div className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center">
                    {produto.is3DModel ? (
                      <Prosthesis3DPreview modelId={produto.id as any} autoRotate={true} className="h-full w-full pointer-events-none" />
                    ) : produto.imagem ? (
                      <img 
                        src={produto.imagem} 
                        alt={produto.nome} 
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <PackageOpen className="h-16 w-16 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-lg line-clamp-1">{produto.nome}</h3>
                    {produto.categoria && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1 block">
                        {produto.categoria}
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2 mb-4 flex-1">
                      {produto.descricao || "Sem descrição"}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t">
                      <span className="font-bold text-lg text-primary">{formatCurrency(produto.preco)}</span>
                      <Button variant="outline" size="sm">Editar</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PROSTHESIS_MODELS, Prosthesis3DPreview } from "@/components/prosthesis-3d-preview";
import { Box, PackageOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPublico,
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

function ProdutosPublico() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

      // Mapeia os produtos da plataforma (PROSTHESIS_MODELS)
      const platformProducts: Product[] = PROSTHESIS_MODELS.map(model => {
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
          is3DModel: !imageUrl, 
          created_at: new Date().toISOString()
        };
      });

      const saved = JSON.parse(localStorage.getItem("clinica_produtos") || "[]");
      
      const savedIds = new Set(saved.map((s: any) => s.id));
      const finalPlatformProducts = platformProducts.filter(p => !savedIds.has(p.id));

      const matchedPaths = new Set(platformProducts.map(p => {
        if (!p.imagem) return null;
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
            descricao: "Produto disponível nas clínicas parceiras.",
            preco: 0, // Poderia buscar de um BD real
            imagem: publicUrlData.publicUrl,
            created_at: file.created_at || new Date().toISOString()
          };
      });

      const savedImageUrls = new Set(saved.map((s: any) => s.imagem));
      const finalBucketProducts = unmatchedBucketProducts.filter(bp => !savedImageUrls.has(bp.imagem));
      
      setProdutos([...finalPlatformProducts, ...saved, ...finalBucketProducts]);
    }

    loadProducts();
  }, []);

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Box className="h-8 w-8 text-primary" />
                Catálogo de Próteses
              </h1>
              <p className="mt-1 text-muted-foreground">
                Conheça os produtos e tratamentos disponibilizados pelas clínicas parceiras.
              </p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar produtos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredProdutos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
              <PackageOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                Não encontramos nenhum produto com esse termo de busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProdutos.map((produto) => (
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
                      <span className="font-bold text-lg text-primary">
                        {produto.preco > 0 ? formatCurrency(produto.preco) : "Sob Consulta"}
                      </span>
                      {produto.preco > 0 && (
                        <Link to="/simular" search={{ valor: produto.preco, modelo: produto.id }}>
                          <Button size="sm" variant="default">Simular</Button>
                        </Link>
                      )}
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

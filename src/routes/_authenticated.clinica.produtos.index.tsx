import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { PlusCircle, Box, PackageOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PROSTHESIS_MODELS, Prosthesis3DPreview } from "@/components/prosthesis-3d-preview";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", descricao: "", preco: "" });

  const loadProducts = async () => {
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
    
    // Check if any platform product has been overridden in saved
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
          descricao: "Produto recuperado do bucket",
          preco: 0,
          imagem: publicUrlData.publicUrl,
          created_at: file.created_at || new Date().toISOString()
        };
    });

    const savedImageUrls = new Set(saved.map((s: any) => s.imagem));
    const finalBucketProducts = unmatchedBucketProducts.filter(bp => !savedImageUrls.has(bp.imagem));
    
    setProdutos([...saved, ...finalPlatformProducts, ...finalBucketProducts]);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleEditClick = (produto: Product) => {
    setEditingProduct(produto);
    setEditForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco.toString(),
    });
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    
    const saved = JSON.parse(localStorage.getItem("clinica_produtos") || "[]");
    const existingIndex = saved.findIndex((p: any) => p.id === editingProduct.id);
    
    const updatedProduct = {
      ...editingProduct,
      nome: editForm.nome,
      descricao: editForm.descricao,
      preco: Number(editForm.preco),
    };

    if (existingIndex >= 0) {
      saved[existingIndex] = updatedProduct;
    } else {
      saved.push(updatedProduct);
    }
    
    localStorage.setItem("clinica_produtos", JSON.stringify(saved));
    toast.success("Produto atualizado com sucesso!");
    setEditingProduct(null);
    loadProducts();
  };

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
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(produto)}>Editar</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Produto</Label>
                <Input 
                  value={editForm.nome} 
                  onChange={e => setEditForm({...editForm, nome: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={editForm.descricao} 
                  onChange={e => setEditForm({...editForm, descricao: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={editForm.preco} 
                  onChange={e => setEditForm({...editForm, preco: e.target.value})} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

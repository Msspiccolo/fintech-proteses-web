import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [{ title: "Meu Perfil | PrótesePay" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    id?: string;
    full_name: string;
    document: string;
    phone: string;
    email: string;
  }>({
    full_name: "",
    document: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        setProfile({
          full_name: data?.full_name || user.user_metadata?.full_name || "",
          document: data?.document || user.user_metadata?.document || "",
          phone: data?.phone || user.user_metadata?.phone || "",
          email: user.email || "",
        });
      } catch (err: any) {
        toast.error("Erro ao carregar perfil: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          document: profile.document,
          phone: profile.phone,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      // Update auth metadata and email optionally
      const updateData: any = {
        data: {
          full_name: profile.full_name,
          document: profile.document,
          phone: profile.phone,
        }
      };

      if (profile.email !== user.email) {
        updateData.email = profile.email;
      }

      const { error: authError } = await supabase.auth.updateUser(updateData);
      if (authError) throw authError;

      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao atualizar perfil: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Meu Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais abaixo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Ao alterar o email, pode ser necessário confirmar o novo endereço.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="document">CPF/CNPJ</Label>
                      <Input
                        id="document"
                        value={profile.document}
                        onChange={(e) => setProfile({ ...profile, document: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        if (confirm("Tem certeza que deseja apagar sua conta? Isso não pode ser desfeito.")) {
                          try {
                            const { error } = await supabase.rpc("delete_own_account");
                            if (error) throw error;
                            
                            await supabase.auth.signOut();
                            window.location.href = "/";
                          } catch (err: any) {
                            toast.error("Erro ao apagar conta: " + err.message);
                          }
                        }
                      }}
                    >
                      Deletar Minha Conta
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

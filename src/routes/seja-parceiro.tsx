import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, TrendingUp, HeartHandshake, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/seja-parceiro")({
  component: SejaParceiro,
});

function SejaParceiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    empresa: "",
    email: "",
    telefone: "",
    capital: "",
    mensagem: "",
    senha: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.senha || formData.senha.length < 6) {
      toast.error("Por favor, insira uma senha com pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            full_name: formData.nome,
            phone: formData.telefone,
            role: "patient",
            is_investor: true,
            investor_company: formData.empresa,
            investor_capital: formData.capital
          }
        }
      });
      
      if (error) throw error;

      if (data.user) {
        let typeStr = "Investidor Anjo";
        if (formData.empresa.toLowerCase().includes("fundo") || formData.empresa.toLowerCase().includes("invest")) typeStr = "Fundo de Investimento";
        else if (formData.empresa.toLowerCase().includes("banco")) typeStr = "Banco Institucional";

        let capitalAmount = 0;
        if (formData.capital === "1") capitalAmount = 500000;
        else if (formData.capital === "2") capitalAmount = 1500000;
        else if (formData.capital === "3") capitalAmount = 3000000;

        // Tenta inserir na tabela credit_partners
        try {
          await supabase.from("credit_partners" as any).insert({
            user_id: data.user.id,
            name: formData.empresa || formData.nome,
            type: typeStr,
            acquired: capitalAmount,
            used: 0,
            status: "Ativo"
          });
        } catch (insertErr) {
          console.warn("Table credit_partners does not exist yet. Please create it.", insertErr);
        }
      }

      toast.success("Conta de parceiro criada com sucesso!");
      navigate({ to: "/parceiro/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-2">
                <Landmark className="mr-2 h-4 w-4" />
                Para Investidores e Fundos
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                Seja um Parceiro de Crédito
              </h1>
              <p className="text-xl text-muted-foreground mt-4">
                Junte-se à ProMobi para democratizar o acesso a próteses ortopédicas. Obtenha rentabilidade atrativa enquanto transforma milhares de vidas.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">Vantagens da Parceria</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                Uma relação onde todos ganham: nossos pacientes recebem o crédito que precisam, as clínicas aumentam suas vendas, e você obtém excelentes retornos.
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              <Card className="border-primary/20">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Rentabilidade Sólida</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Ao financiar próteses e tratamentos de saúde, você garante retornos financeiros atrativos e consistentes, com taxas de juros competitivas geridas diretamente pela nossa plataforma.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20">
                <CardHeader>
                  <ShieldCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Baixo Risco e Segurança</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    A ProMobi realiza análise de crédito rigorosa via API (SPC/Serasa) e formaliza os contratos digitalmente, mitigando a inadimplência e protegendo o seu capital.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <HeartHandshake className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Impacto Social Real</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    O seu capital será diretamente destinado a melhorar a qualidade de vida e a mobilidade de pessoas, proporcionando inclusão social e resgate da autoestima.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="max-w-2xl mx-auto bg-card rounded-xl border shadow-sm p-6 md:p-10">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground">Tenho Interesse em Investir</h3>
                <p className="text-muted-foreground mt-2">
                  Preencha o formulário abaixo e um de nossos executivos entrará em contato para apresentar as condições e oportunidades.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo / Representante</Label>
                    <Input id="nome" required placeholder="João da Silva" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="empresa">Empresa / Fundo (Opcional)</Label>
                    <Input id="empresa" placeholder="Nome da instituição" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail Corporativo</Label>
                    <Input id="email" type="email" required placeholder="joao@fundo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                    <Input id="telefone" required placeholder="(00) 00000-0000" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Crie uma Senha de Acesso</Label>
                    <Input id="senha" type="password" required placeholder="******" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capital">Expectativa de Capital Disponibilizado</Label>
                    <select id="capital" value={formData.capital} onChange={e => setFormData({...formData, capital: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="">Selecione uma faixa...</option>
                      <option value="1">Até R$ 500.000</option>
                      <option value="2">R$ 500.000 a R$ 2.000.000</option>
                      <option value="3">Acima de R$ 2.000.000</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mensagem">Mensagem (Opcional)</Label>
                  <Textarea id="mensagem" placeholder="Diga-nos um pouco sobre a sua tese de investimento ou dúvidas..." className="min-h-[100px]" value={formData.mensagem} onChange={e => setFormData({...formData, mensagem: e.target.value})} />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Quero ser um parceiro"}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

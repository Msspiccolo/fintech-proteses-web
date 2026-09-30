import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, ArrowDownToLine, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/clinica/financeiro")({
  component: FinanceiroClinica,
});

function FinanceiroClinica() {
  const [saving, setSaving] = useState(false);
  
  const [bankData, setBankData] = useState({
    banco: "077 - Banco Inter",
    agencia: "0001",
    conta: "1234567-8",
    chavePix: "cnpj@minhaclinica.com.br"
  });

  const handleSaveBankData = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Dados bancários atualizados com sucesso!");
    }, 1000);
  };

  const [repasses, setRepasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRepasses() {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;
        
        const { data: clinicAff } = await supabase
          .from("clinic_affiliations")
          .select("clinic_id")
          .eq("user_id", user.user.id)
          .single();
          
        if (!clinicAff?.clinic_id) return;

        const { data: loans, error } = await supabase
          .from("loan_applications")
          .select(`
            id,
            created_at,
            requested_amount,
            status,
            patient_id
          `)
          .eq("clinic_id", clinicAff.clinic_id)
          .in("status", ["approved", "completed", "pending", "under_review"]);
          
        if (error) throw error;
        
        if (loans) {
          // Fetch profiles for patient names
          const patientIds = loans.map(l => l.patient_id).filter(Boolean);
          let profilesMap: Record<string, string> = {};
          
          if (patientIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", patientIds);
              
            if (profiles) {
              profilesMap = profiles.reduce((acc, p) => ({...acc, [p.id]: p.full_name || "Paciente"}), {});
            }
          }

          setRepasses(loans.map(loan => ({
            id: loan.id.substring(0, 8).toUpperCase(),
            data: loan.created_at,
            valor: loan.requested_amount,
            paciente: profilesMap[loan.patient_id] || "Paciente Protegido",
            status: (loan.status === "approved" || loan.status === "completed") ? "Concluído" : "Processando"
          })));
        }
      } catch (err) {
        console.error("Erro ao buscar repasses:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRepasses();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Landmark className="h-8 w-8 text-primary" />
              Meus Repasses
            </h1>
            <p className="mt-1 text-muted-foreground">
              Acompanhe os repasses financeiros e gerencie seus dados bancários.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Bancários</CardTitle>
                  <CardDescription>Conta para recebimento dos tratamentos financiados</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveBankData} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="banco">Banco</Label>
                      <Input 
                        id="banco" 
                        value={bankData.banco} 
                        onChange={e => setBankData({...bankData, banco: e.target.value})}
                        placeholder="Ex: 341 - Itaú" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agencia">Agência</Label>
                      <Input 
                        id="agencia" 
                        value={bankData.agencia} 
                        onChange={e => setBankData({...bankData, agencia: e.target.value})}
                        placeholder="0000" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conta">Conta Corrente</Label>
                      <Input 
                        id="conta" 
                        value={bankData.conta} 
                        onChange={e => setBankData({...bankData, conta: e.target.value})}
                        placeholder="00000-0" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pix">Chave PIX (Opcional)</Label>
                      <Input 
                        id="pix" 
                        value={bankData.chavePix} 
                        onChange={e => setBankData({...bankData, chavePix: e.target.value})}
                        placeholder="CNPJ, Email, Celular..." 
                      />
                    </div>
                    <Button type="submit" className="w-full mt-4" disabled={saving}>
                      {saving ? "Salvando..." : "Salvar Dados"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Histórico de Repasses</span>
                    <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
                      <ArrowDownToLine size={14} /> Exportar Extrato
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Código</th>
                          <th className="px-4 py-3 font-medium">Data</th>
                          <th className="px-4 py-3 font-medium">Paciente</th>
                          <th className="px-4 py-3 font-medium">Valor</th>
                          <th className="px-4 py-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                              Carregando repasses...
                            </td>
                          </tr>
                        ) : repasses.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                              Nenhum repasse encontrado.
                            </td>
                          </tr>
                        ) : (
                          repasses.map((rep) => (
                            <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{rep.id}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(rep.data)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{rep.paciente}</td>
                              <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(rep.valor)}</td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                  ${rep.status === "Concluído" ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" : ""}
                                  ${rep.status === "Processando" ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800" : ""}
                                `}
                                >
                                  {rep.status === "Concluído" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                  {rep.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-4 items-start">
                <div className="mt-1">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Como funciona o repasse?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assim que o crédito do seu paciente é aprovado e o contrato é formalizado, o valor integral (descontadas taxas contratuais) é transferido para a sua conta bancária cadastrada acima em até 2 dias úteis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

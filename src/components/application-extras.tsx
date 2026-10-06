import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { reportInstallmentPayment, confirmInstallmentPayment } from "@/lib/loans.functions";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Circle, FileText, Upload, Download, X, Printer, Banknote, MessageCircle, Send } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const db = supabase as any;

export const DOC_TYPES: Record<string, string> = {
  medical_report: "Laudo médico",
  id: "RG / CNH",
  income: "Comprovante de renda",
  address: "Comprovante de residência",
  other: "Outro",
};

export const FAB_STATUS: Record<string, string> = {
  requested: "Solicitada",
  in_production: "Em produção",
  shipped: "Enviada",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

/* ---------- Timeline ---------- */
export function ApplicationTimeline({
  status,
  createdAt,
  reviewedAt,
  hasDocs,
}: {
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  hasDocs: boolean;
}) {
  const rejected = status === "rejected" || status === "cancelled";
  const decided = ["approved", "rejected", "paid", "cancelled"].includes(status);
  const steps = [
    { label: "Enviada", done: true, date: createdAt },
    { label: "Documentos", done: hasDocs || decided },
    { label: "Em análise", done: true, current: !decided },
    {
      label: rejected ? (status === "cancelled" ? "Cancelada" : "Reprovada") : "Aprovada",
      done: decided,
      date: reviewedAt ?? undefined,
      bad: rejected,
    },
    { label: "Pago", done: status === "paid" },
  ];
  return (
    <ol className="flex items-start gap-1 overflow-x-auto">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 min-w-[64px] flex-col items-center text-center">
          <div className="flex w-full items-center">
            <div className={`h-0.5 flex-1 ${i === 0 ? "opacity-0" : s.done ? "bg-primary" : "bg-border"}`} />
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                s.bad
                  ? "bg-destructive text-destructive-foreground"
                  : s.done
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {s.bad ? <X className="h-3 w-3" /> : s.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
            </span>
            <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "opacity-0" : steps[i + 1].done ? "bg-primary" : "bg-border"}`} />
          </div>
          <span className={`mt-1 text-xs ${s.current ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {s.label}
          </span>
          {s.date && <span className="text-[10px] text-muted-foreground">{formatDate(s.date)}</span>}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Documents ---------- */
export function useApplicationDocuments(applicationId: string) {
  return useQuery({
    queryKey: ["loan-documents", applicationId],
    queryFn: async () => {
      const { data, error } = await db
        .from("loan_documents")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export async function openDocument(path: string) {
  const { data, error } = await supabase.storage.from("loan-documents").createSignedUrl(path, 120);
  if (error || !data) return toast.error("Não foi possível abrir o arquivo");
  window.open(data.signedUrl, "_blank", "noopener");
}

export function ApplicationDocuments({
  applicationId,
  canUpload,
}: {
  applicationId: string;
  canUpload: boolean;
}) {
  const qc = useQueryClient();
  const { data: docs = [] } = useApplicationDocuments(applicationId);
  const [docType, setDocType] = useState("medical_report");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error("Arquivo maior que 10 MB");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Faça login novamente");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${u.user.id}/${applicationId}/${Date.now()}-${safe}`;
      const up = await supabase.storage.from("loan-documents").upload(path, file);
      if (up.error) throw up.error;
      const { error } = await db.from("loan_documents").insert({
        application_id: applicationId,
        patient_id: u.user.id,
        doc_type: docType,
        file_name: file.name,
        storage_path: path,
      });
      if (error) throw error;
      toast.success("Documento enviado");
      qc.invalidateQueries({ queryKey: ["loan-documents", applicationId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar documento");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(doc: any) {
    await supabase.storage.from("loan-documents").remove([doc.storage_path]);
    const { error } = await db.from("loan_documents").delete().eq("id", doc.id);
    if (error) return toast.error("Erro ao remover");
    qc.invalidateQueries({ queryKey: ["loan-documents", applicationId] });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Documentos</p>
      {docs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum documento enviado.</p>}
      <ul className="space-y-1">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <button className="truncate text-left hover:underline" onClick={() => openDocument(d.storage_path)}>
              {DOC_TYPES[d.doc_type] ?? d.doc_type} — {d.file_name}
            </button>
            {canUpload && (
              <button className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => remove(d)} aria-label="Remover">
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canUpload && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> {busy ? "Enviando..." : "Anexar arquivo"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------- Fabrication ---------- */
const MODELS = ["Prótese de joelho", "Prótese de quadril", "Prótese de perna", "Prótese de pé", "Prótese de mão", "Prótese de braço"];
const MATERIALS = ["Titânio", "Fibra de carbono", "Polímero PLA/PETG", "Silicone médico"];

function stlFor(model: string) {
  // Placeholder STL (triangle cube) so the user gets a printable starting file.
  const name = model.replace(/\s+/g, "_");
  const v = (x: number, y: number, z: number) => `      vertex ${x} ${y} ${z}\n`;
  const faces: number[][][] = [
    [[0,0,0],[10,0,0],[10,10,0]],[[0,0,0],[10,10,0],[0,10,0]],
    [[0,0,40],[10,10,40],[10,0,40]],[[0,0,40],[0,10,40],[10,10,40]],
    [[0,0,0],[0,0,40],[10,0,40]],[[0,0,0],[10,0,40],[10,0,0]],
    [[0,10,0],[10,10,40],[0,10,40]],[[0,10,0],[10,10,0],[10,10,40]],
    [[0,0,0],[0,10,40],[0,0,40]],[[0,0,0],[0,10,0],[0,10,40]],
    [[10,0,0],[10,0,40],[10,10,40]],[[10,0,0],[10,10,40],[10,10,0]],
  ];
  let s = `solid ${name}\n`;
  for (const f of faces) s += `  facet normal 0 0 0\n    outer loop\n${f.map((p) => v(p[0], p[1], p[2])).join("")}    endloop\n  endfacet\n`;
  return s + `endsolid ${name}\n`;
}

export function downloadStl(model: string) {
  const blob = new Blob([stlFor(model)], { type: "model/stl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${model.replace(/\s+/g, "_")}.stl`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function FabricationRequest({ applicationId, status }: { applicationId: string; status: string }) {
  const qc = useQueryClient();
  const [model, setModel] = useState(MODELS[0]);
  const [material, setMaterial] = useState(MATERIALS[0]);
  const [busy, setBusy] = useState(false);
  const { data: orders = [] } = useQuery({
    queryKey: ["fab-orders", applicationId],
    queryFn: async () => {
      const { data, error } = await db.from("fabrication_orders").select("*").eq("application_id", applicationId);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (!["approved", "paid"].includes(status)) return null;

  async function request() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("fabrication_orders").insert({
      application_id: applicationId,
      patient_id: u.user?.id,
      model,
      material,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Fabricação solicitada!");
    qc.invalidateQueries({ queryKey: ["fab-orders", applicationId] });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">Fabricação da peça 3D</p>
      {orders.map((o) => (
        <div key={o.id} className="flex flex-col gap-2 border-b border-border pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
          <div className="flex items-center justify-between text-sm">
            <span>{o.model} · {o.material} — <b className="text-primary">{FAB_STATUS[o.status] ?? o.status}</b></span>
            <Button size="sm" variant="ghost" onClick={() => downloadStl(o.model)}>
              <Download className="mr-1 h-4 w-4" /> STL
            </Button>
          </div>
          {/* Tracking info section */}
          <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-2.5 rounded-md text-xs border border-border/50 mt-2">
            <span className="font-semibold text-foreground">Rastreio:</span>
            <span className="font-mono bg-background px-2 py-1 border rounded">{o.tracking_code || "BR" + String(o.id).replace(/\D/g, '').slice(0, 9).padStart(9, '0') + "BR"}</span>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-6 ml-auto">
                  Acompanhar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="text-primary">📦</span> Rastreamento de Encomenda
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="p-3 bg-muted rounded-md mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Código de Rastreio</p>
                      <p className="font-mono text-sm">{o.tracking_code || "BR" + String(o.id).replace(/\D/g, '').slice(0, 9).padStart(9, '0') + "BR"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                      <p className="text-sm text-primary font-semibold">{FAB_STATUS[o.status] ?? o.status}</p>
                    </div>
                  </div>
                  <div className="relative border-l-2 border-primary/30 ml-3 pl-5 space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[27px] bg-primary w-3 h-3 rounded-full border-2 border-background shadow-[0_0_0_3px_var(--primary)] shadow-primary/20"></div>
                      <p className="text-sm font-semibold text-foreground">Em rota de entrega</p>
                      <p className="text-xs text-muted-foreground">Unidade de Distribuição, São Paulo - SP</p>
                      <p className="text-xs font-mono mt-1 text-muted-foreground/80">Hoje, 08:42</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[27px] bg-muted-foreground/40 w-3 h-3 rounded-full border-2 border-background"></div>
                      <p className="text-sm font-semibold text-foreground">Objeto em trânsito</p>
                      <p className="text-xs text-muted-foreground">De Unidade de Logística Integrada para Unidade de Distribuição</p>
                      <p className="text-xs font-mono mt-1 text-muted-foreground/80">Ontem, 15:30</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[27px] bg-muted-foreground/40 w-3 h-3 rounded-full border-2 border-background"></div>
                      <p className="text-sm font-semibold text-foreground">Objeto postado</p>
                      <p className="text-xs text-muted-foreground">Agência ProMobi, São José dos Campos - SP</p>
                      <p className="text-xs font-mono mt-1 text-muted-foreground/80">Há 2 dias, 10:15</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
      {orders.length === 0 && (
        <div className="flex flex-wrap gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={material} onValueChange={setMaterial}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MATERIALS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={busy} onClick={request}>
            <Printer className="mr-1 h-4 w-4" /> Solicitar fabricação
          </Button>
        </div>
      )}
    </div>
  );
}

export function PatientInvoices({ app, isClinicView }: { app: any, isClinicView?: boolean }) {
  if (app.status !== "approved" && app.status !== "paid") return null;

  const totalInstallments = app.installments || 1;
  const paidInstallments = app.installments_paid || 0;
  const reportedInstallments = Math.max(app.installments_reported || 0, paidInstallments);
  const queryClient = useQueryClient();
  const reportPayment = useServerFn(reportInstallmentPayment);
  const confirmPayment = useServerFn(confirmInstallmentPayment);
  const [isReporting, setIsReporting] = useState(false);
  
  // Calculate due dates starting 1 month after approval
  const approvalDate = new Date(app.reviewed_at || app.created_at);
  
  // Read custom dates from localStorage if any
  const savedClientDataStr = typeof window !== 'undefined' ? localStorage.getItem("clinica_vencimentos") || "{}" : "{}";
  const savedClientData = JSON.parse(savedClientDataStr);
  const customDueDates = savedClientData[app.patient_id]?.vencimentosPersonalizados || {};

  const invoices = Array.from({ length: totalInstallments }).map((_, i) => {
    let dueDate = new Date(approvalDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    if (customDueDates[i]) {
      dueDate = new Date(customDueDates[i] + "T12:00:00Z");
    }
    
    let status = "Futura";
    if (i < paidInstallments) {
      status = "Paga";
    } else if (i < reportedInstallments) {
      status = "Aguardando";
    } else if (i === reportedInstallments) {
      status = "Próxima";
    }

    // Check if overdue
    const isOverdue = status === "Próxima" && dueDate < new Date();

    return {
      index: i + 1,
      dueDate,
      status,
      isOverdue,
      amount: app.monthly_payment,
    };
  });

  return (
    <div className="mt-4">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Banknote className="mr-2 h-4 w-4" />
            Minhas Faturas
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Minhas Faturas</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {paidInstallments} de {totalInstallments} parcelas pagas
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.index} className={`flex items-center justify-between p-3 rounded-lg border ${inv.status === "Paga" ? "bg-green-50/50 border-green-100" : inv.isOverdue ? "bg-red-50/50 border-red-100" : "bg-card"}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">Parcela {inv.index}/{totalInstallments}</p>
                      {inv.status === "Paga" && <span className="text-[10px] uppercase font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">Paga</span>}
                      {inv.status === "Aguardando" && <span className="text-[10px] uppercase font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">Aguardando Confirmação</span>}
                      {inv.status === "Próxima" && !inv.isOverdue && <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">A Vencer</span>}
                      {inv.isOverdue && <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">Vencida</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencimento: {formatDate(inv.dueDate.toISOString())}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(inv.amount)}</p>
                    {(inv.status === "Próxima" || (isClinicView && inv.status === "Aguardando")) && (
                      <Button 
                        size="sm" 
                        disabled={isReporting}
                        className={`mt-1 h-7 text-xs ${isClinicView ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        onClick={async () => {
                          try {
                            setIsReporting(true);
                            if (isClinicView) {
                              await confirmPayment({ data: { id: app.id } });
                              toast.success("Pagamento confirmado com sucesso!");
                              await queryClient.invalidateQueries({ queryKey: ["clinic-loan-applications"] });
                            } else {
                              await reportPayment({ data: { id: app.id } });
                              await queryClient.invalidateQueries({ queryKey: ["my-loan-applications"] });
                              toast.success("Pagamento informado! A clínica irá confirmar em breve.");
                            }
                          } catch (e: any) {
                            toast.error(e.message || "Erro ao processar pagamento");
                          } finally {
                            setIsReporting(false);
                          }
                        }}
                      >
                        {isClinicView ? "Confirmar Pagamento" : "Avisar Pagamento"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ApplicationChat({ applicationId }: { applicationId: string }) {
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await db.auth.getUser();
      if (data.user) setUserId(data.user.id);
      return data.user;
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["application_messages", applicationId],
    queryFn: async () => {
      const { data, error } = await db
        .from("application_messages")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const channel = db
      .channel(`chat_${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "application_messages",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload: any) => {
          queryClient.setQueryData(["application_messages", applicationId], (old: any) => {
            if (!old) return [payload.new];
            if (old.some((m: any) => m.id === payload.new.id)) return old;
            return [...old, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [applicationId, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;

    const msgText = newMessage.trim();
    setNewMessage("");

    const { error } = await db.from("application_messages").insert({
      application_id: applicationId,
      sender_id: userId,
      text: msgText,
    });

    if (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    }
  }

  return (
    <div className="space-y-3 pt-4 border-t border-border">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MessageCircle className="h-4 w-4 text-primary" />
        Mensagens
      </div>
      <div className="flex flex-col h-[250px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20 rounded-md border mb-3">
          {messages.length === 0 ? (
             <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
               Nenhuma mensagem encontrada.
             </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none"
                    }`}
                  >
                    <p className="text-sm mb-1">{msg.text}</p>
                    <span className="text-[10px] opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            placeholder="Digite sua mensagem..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PatientApplicationExtras({ app }: { app: any }) {
  const { data: docs = [] } = useApplicationDocuments(app.id);
  return (
    <div className="space-y-4 border-t border-border px-6 py-4">
      <ApplicationTimeline status={app.status} createdAt={app.created_at} reviewedAt={app.reviewed_at} hasDocs={docs.length > 0} />
      <ApplicationDocuments applicationId={app.id} canUpload={app.status === "pending"} />
      <FabricationRequest applicationId={app.id} status={app.status} />
      <PatientInvoices app={app} />
      <ApplicationChat applicationId={app.id} />
    </div>
  );
}


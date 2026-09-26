import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Circle, FileText, Upload, Download, X, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";

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
        <div key={o.id} className="flex items-center justify-between text-sm">
          <span>{o.model} · {o.material} — <b>{FAB_STATUS[o.status] ?? o.status}</b></span>
          <Button size="sm" variant="ghost" onClick={() => downloadStl(o.model)}>
            <Download className="mr-1 h-4 w-4" /> STL
          </Button>
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

export function PatientApplicationExtras({ app }: { app: any }) {
  const { data: docs = [] } = useApplicationDocuments(app.id);
  return (
    <div className="space-y-4 border-t border-border px-6 py-4">
      <ApplicationTimeline status={app.status} createdAt={app.created_at} reviewedAt={app.reviewed_at} hasDocs={docs.length > 0} />
      <ApplicationDocuments applicationId={app.id} canUpload={app.status === "pending"} />
      <FabricationRequest applicationId={app.id} status={app.status} />
    </div>
  );
}

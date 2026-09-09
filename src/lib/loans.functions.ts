import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDB, saveDB } from "./mock-db";

const createApplicationSchema = z.object({
  requestedAmount: z.number().positive(),
  downPayment: z.number().min(0),
  installments: z.number().int().min(1).max(60),
  monthlyPayment: z.number().positive(),
  interestRate: z.number().min(0),
  totalCost: z.number().positive(),
  clinicId: z.string().optional(), // Changed to string since mock UUIDs are used
  purpose: z.string().optional(),
});

const updateApplicationSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "rejected", "paid", "cancelled"]),
  notes: z.string().optional(),
});

export const createLoanApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => createApplicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDB();
    const application = {
      id: `mock-loan-${Date.now()}`,
      patient_id: context.userId,
      clinic_id: data.clinicId ?? null,
      requested_amount: data.requestedAmount,
      down_payment: data.downPayment,
      installments: data.installments,
      monthly_payment: data.monthlyPayment,
      interest_rate: data.interestRate,
      total_cost: data.totalCost,
      purpose: data.purpose ?? null,
      status: "pending" as const,
      notes: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString()
    };

    db.loans.push(application);
    saveDB(db);

    return { application };
  });

export const getMyLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const applications = db.loans
      .filter(l => l.patient_id === context.userId)
      .map(l => ({
        ...l,
        clinics: db.clinics.find(c => c.id === l.clinic_id)
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { applications };
  });

export const getClinicLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const affiliations = db.affiliations.filter(a => a.user_id === context.userId);
    const clinicIds = affiliations.map(a => a.clinic_id);
    
    if (clinicIds.length === 0) return { applications: [] };

    const applications = db.loans
      .filter(l => l.clinic_id && clinicIds.includes(l.clinic_id))
      .map(l => ({
        ...l,
        clinics: db.clinics.find(c => c.id === l.clinic_id),
        profiles: db.users.find(u => u.id === l.patient_id)
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { applications };
  });

export const getAllLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const currentUser = db.users.find(u => u.id === context.userId);
    if (currentUser?.role !== "admin") throw new Error("Forbidden");

    const applications = db.loans
      .map(l => ({
        ...l,
        clinics: db.clinics.find(c => c.id === l.clinic_id),
        profiles: db.users.find(u => u.id === l.patient_id)
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { applications };
  });

export const updateLoanApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateApplicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDB();
    const currentUser = db.users.find(u => u.id === context.userId);
    if (currentUser?.role !== "admin") throw new Error("Forbidden");

    const application = db.loans.find(l => l.id === data.id);
    if (!application) throw new Error("Loan not found");

    application.status = data.status;
    application.notes = data.notes ?? null;
    application.reviewed_by = context.userId;
    application.reviewed_at = new Date().toISOString();

    saveDB(db);

    return { application };
  });

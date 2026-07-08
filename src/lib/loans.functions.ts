import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createApplicationSchema = z.object({
  requestedAmount: z.number().positive(),
  downPayment: z.number().min(0),
  installments: z.number().int().min(1).max(60),
  monthlyPayment: z.number().positive(),
  interestRate: z.number().min(0),
  totalCost: z.number().positive(),
  clinicId: z.string().uuid().optional(),
  purpose: z.string().optional(),
});

const updateApplicationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "paid", "cancelled"]),
  notes: z.string().optional(),
});

export const createLoanApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createApplicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: application, error } = await context.supabase
      .from("loan_applications")
      .insert({
        patient_id: context.userId,
        clinic_id: data.clinicId ?? null,
        requested_amount: data.requestedAmount,
        down_payment: data.downPayment,
        installments: data.installments,
        monthly_payment: data.monthlyPayment,
        interest_rate: data.interestRate,
        total_cost: data.totalCost,
        purpose: data.purpose ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { application };
  });

export const getMyLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("loan_applications")
      .select("*, clinics(name)")
      .eq("patient_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return { applications: data ?? [] };
  });

export const getClinicLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: affiliations, error: affiliationsError } = await context.supabase
      .from("clinic_affiliations")
      .select("clinic_id")
      .eq("user_id", context.userId);

    if (affiliationsError) {
      throw new Error(affiliationsError.message);
    }

    const clinicIds = affiliations?.map((a) => a.clinic_id) ?? [];
    if (clinicIds.length === 0) {
      return { applications: [] };
    }

    const { data, error } = await context.supabase
      .from("loan_applications")
      .select("*, clinics(name), profiles(full_name)")
      .in("clinic_id", clinicIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return { applications: data ?? [] };
  });

export const getAllLoanApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (adminError || !isAdmin) {
      throw new Error("Forbidden");
    }

    const { data, error } = await context.supabase
      .from("loan_applications")
      .select("*, clinics(name), profiles(full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return { applications: data ?? [] };
  });

export const updateLoanApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => updateApplicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (adminError || !isAdmin) {
      throw new Error("Forbidden");
    }

    const { data: application, error } = await context.supabase
      .from("loan_applications")
      .update({
        status: data.status,
        notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { application };
  });

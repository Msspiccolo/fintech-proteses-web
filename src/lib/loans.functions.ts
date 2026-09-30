import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createApplicationSchema = z.object({
  prosthesisAmount: z.number().min(0),
  adaptationAmount: z.number().min(0),
  maintenanceAmount: z.number().min(0),
  downPayment: z.number().min(0),
  installments: z.number().int().min(1).max(60),
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
  .validator((data: unknown) => createApplicationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const requestedAmount = data.prosthesisAmount + data.adaptationAmount + data.maintenanceAmount;
    if (requestedAmount <= 0) {
      throw new Error("O valor total deve ser maior que zero.");
    }
    const interestRate = 1.99;
    const financedAmount = Math.max(0, requestedAmount - data.downPayment);
    const monthlyRate = interestRate / 100;
    
    const monthlyPayment =
      monthlyRate === 0
        ? financedAmount / data.installments
        : (financedAmount * monthlyRate * Math.pow(1 + monthlyRate, data.installments)) /
          (Math.pow(1 + monthlyRate, data.installments) - 1);

    const totalCost = monthlyPayment * data.installments + data.downPayment;

    const breakdownText = `[Prótese: R$ ${data.prosthesisAmount} | Adaptação: R$ ${data.adaptationAmount} | Manutenção: R$ ${data.maintenanceAmount}]`;
    const finalPurpose = [data.purpose, breakdownText].filter(Boolean).join(" ");

    const { data: application, error } = await context.supabase
      .from("loan_applications")
      .insert({
        patient_id: context.userId,
        clinic_id: data.clinicId ?? null,
        requested_amount: requestedAmount,
        down_payment: data.downPayment,
        installments: data.installments,
        monthly_payment: Number(monthlyPayment.toFixed(2)),
        interest_rate: interestRate,
        total_cost: Number(totalCost.toFixed(2)),
        purpose: finalPurpose,
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

    const clinicIds = affiliations?.map((a: { clinic_id: string }) => a.clinic_id) ?? [];
    if (clinicIds.length === 0) {
      return { applications: [] };
    }

    const { data, error } = await context.supabase
      .from("loan_applications")
      .select("*, clinics(name), profiles!loan_applications_patient_id_fkey(full_name)")
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
      .select("*, clinics(name), profiles!loan_applications_patient_id_fkey(full_name), loan_documents(*), fabrication_orders(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return { applications: data ?? [] };
  });

export const updateLoanApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateApplicationSchema.parse(data))
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

const updateFabricationOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
});

export const updateFabricationOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateFabricationOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: adminError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (adminError || !isAdmin) {
      throw new Error("Forbidden");
    }

    const { data: order, error } = await context.supabase
      .from("fabrication_orders")
      .update({
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { order };
  });

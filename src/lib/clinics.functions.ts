import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const registerClinicSchema = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  document: z.string().min(14).max(18).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zipCode: z.string().optional(),
});

export const getApprovedClinics = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const supabasePublic = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { data, error } = await supabasePublic
    .from("clinics")
    .select("*")
    .eq("status", "approved")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return { clinics: data ?? [] };
});

export const getClinicByUser = createServerFn({ method: "GET" })
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
      return { clinics: [] };
    }

    const { data, error } = await context.supabase
      .from("clinics")
      .select("*")
      .in("id", clinicIds);

    if (error) {
      throw new Error(error.message);
    }

    return { clinics: data ?? [] };
  });

export const registerClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => registerClinicSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: clinic, error } = await context.supabase
      .from("clinics")
      .insert({
        name: data.name,
        legal_name: data.legalName ?? null,
        document: data.document ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        zip_code: data.zipCode ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const { error: affiliationError } = await context.supabase.from("clinic_affiliations").insert({
      user_id: context.userId,
      clinic_id: clinic.id,
      role: "owner",
    });

    if (affiliationError) {
      throw new Error(affiliationError.message);
    }

    return { clinic };
  });

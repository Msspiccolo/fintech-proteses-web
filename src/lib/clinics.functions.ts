import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDB, saveDB } from "./mock-db";

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

const updateClinicStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export const getApprovedClinics = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDB();
  const clinics = db.clinics.filter(c => c.status === "approved").sort((a, b) => a.name.localeCompare(b.name));
  return { clinics };
});

export const getAllClinicsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const clinics = [...db.clinics].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { clinics };
  });

export const updateClinicStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateClinicStatusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDB();
    const clinic = db.clinics.find(c => c.id === data.id);
    if (!clinic) throw new Error("Clinic not found");

    clinic.status = data.status;
    saveDB(db);

    return { clinic };
  });

export const getClinicByUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const affiliations = db.affiliations.filter(a => a.user_id === context.userId);
    const clinicIds = affiliations.map(a => a.clinic_id);
    if (clinicIds.length === 0) return { clinics: [] };

    const clinics = db.clinics.filter(c => clinicIds.includes(c.id));
    return { clinics };
  });

export const registerClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => registerClinicSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDB();
    const clinic = {
      id: `mock-clinic-${Date.now()}`,
      name: data.name,
      legal_name: data.legalName ?? null,
      document: data.document ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip_code: data.zipCode ?? null,
      status: "pending" as const,
      created_at: new Date().toISOString()
    };
    
    db.clinics.push(clinic);
    
    db.affiliations.push({
      user_id: context.userId,
      clinic_id: clinic.id,
      role: "owner"
    });

    saveDB(db);
    return { clinic };
  });

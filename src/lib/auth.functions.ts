import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  document: z.string().min(11).max(18),
  phone: z.string().min(10).max(20),
  role: z.enum(["patient", "clinic"]),
  clinicName: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signUp = createServerFn({ method: "POST" })
  .validator((data) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabasePublic = createClient<Database>(
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

    const { data: authData, error: signUpError } = await supabasePublic.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (signUpError || !authData.user) {
      throw new Error(signUpError?.message ?? "Failed to create account");
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabasePublic
      .from("profiles")
      .insert({
        user_id: userId,
        full_name: data.fullName,
        document: data.document,
        phone: data.phone,
        role: data.role,
      });

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: roleError } = await supabasePublic.from("user_roles").insert({
      user_id: userId,
      role: data.role,
    });

    if (roleError) {
      throw new Error(roleError.message);
    }

    if (data.role === "clinic" && data.clinicName) {
      const { error: clinicError } = await supabasePublic.from("clinics").insert({
        name: data.clinicName,
        status: "pending",
      });

      if (clinicError) {
        throw new Error(clinicError.message);
      }
    }

    return { userId };
  });

export const signIn = createServerFn({ method: "POST" })
  .validator((data) => signInSchema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabasePublic = createClient<Database>(
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

    const { data: authData, error } = await supabasePublic.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error || !authData.user) {
      throw new Error(error?.message ?? "Invalid credentials");
    }

    return { userId: authData.user.id };
  });

export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    return { profile: data, roles: roles?.map((r) => r.role) ?? [] };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        fullName: z.string().min(2).optional(),
        phone: z.string().min(10).max(20).optional(),
        birthDate: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        phone: data.phone,
        birth_date: data.birthDate,
      })
      .eq("user_id", context.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

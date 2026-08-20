import { supabase } from "@/integrations/supabase/client";

export type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  document: string;
  phone: string;
  role: "patient" | "clinic" | "admin";
  clinicName?: string;
};

/** Completes the user's profile + role after a session exists. */
export async function completeSignup(input: Omit<SignUpInput, "email" | "password">) {
  const { error } = await supabase.rpc("complete_signup", {
    _full_name: input.fullName,
    _document: input.document,
    _phone: input.phone,
    _role: input.role,
    _clinic_name: input.clinicName ?? undefined,
  });
  if (error) throw new Error(error.message);
}

export async function signUpWithPassword(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: { 
        full_name: input.fullName,
        document: input.document,
        phone: input.phone,
        role: input.role,
        clinic_name: input.clinicName,
      },
    },
  });
  if (error) throw new Error(error.message);

  if (data.session) {
    await completeSignup(input);
    return { needsEmailConfirmation: false as const };
  }
  return { needsEmailConfirmation: true as const };
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw new Error(error.message);
}

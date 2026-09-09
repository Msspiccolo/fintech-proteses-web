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

import { mockLogin, mockSignup } from "./auth.functions";

export async function signUpWithPassword(input: SignUpInput) {
  const result = await mockSignup({ data: input });
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_access_token", result.token);
    localStorage.setItem("mock_role_hint", result.user.role);
  }
  return { needsEmailConfirmation: false as const };
}

export async function signInWithPassword(email: string, password: string) {
  const result = await mockLogin({ data: { email, password } });
  if (typeof window !== "undefined") {
    localStorage.setItem("mock_access_token", result.token);
    localStorage.setItem("mock_role_hint", result.user.role);
  }
  return { user: result.user };
}

export async function resetPasswordForEmail(email: string) {
  console.log("Mock reset password for", email);
}

export async function updatePassword(password: string) {
  console.log("Mock update password");
}

export async function setAccountAsClinic(): Promise<void> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("mock_access_token") : null;
    if (!token) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("user_role_hint", "clinic");
      localStorage.setItem(`user_role_${token}`, "clinic");
      // MOCK: In a real app we would update the backend profile here.
    }
  } catch (err) {
    console.error("Error setting account as clinic:", err);
  }
}

import { getCurrentUserProfile } from "./auth.functions";

export async function getAuthenticatedUserRole(): Promise<"patient" | "clinic" | "admin"> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("mock_access_token") : null;
    if (!token) return "patient";

    // Read the role hint directly from localStorage to prevent async network race conditions
    const roleHint = typeof window !== "undefined" ? localStorage.getItem("mock_role_hint") : null;
    if (roleHint === "admin") return "admin";
    if (roleHint === "clinic") return "clinic";

    const result = await getCurrentUserProfile();
    const role = result?.profile?.role;
    
    if (role === "admin") return "admin";
    if (role === "clinic") return "clinic";
    
    return "patient";
  } catch (err) {
    console.error("Error detecting user role:", err);
    return "patient";
  }
}

export function redirectUserByRole(
  role: "patient" | "clinic" | "admin",
  navigate?: (opts: { to: string; replace?: boolean }) => void,
) {
  if (role === "clinic") {
    if (navigate) {
      navigate({ to: "/clinica/dashboard", replace: true });
    } else {
      window.location.href = "/clinica/dashboard";
    }
    return;
  }
  if (role === "admin") {
    if (navigate) {
      navigate({ to: "/admin/dashboard", replace: true });
    } else {
      window.location.href = "/admin/dashboard";
    }
    return;
  }
  if (navigate) {
    navigate({ to: "/paciente/dashboard", replace: true });
  } else {
    window.location.href = "/paciente/dashboard";
  }
}

export interface KnownUser {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  document?: string | null;
  phone?: string | null;
  roles?: string[];
  role?: string;
  clinic_name?: string | null;
  created_at?: string;
}

export function recordKnownUser(user: Partial<KnownUser> & { user_id: string }) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("protesepay_system_users");
    const list: KnownUser[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (u) =>
        u.user_id === user.user_id ||
        (user.email && u.email?.toLowerCase() === user.email.toLowerCase()),
    );

    const existing = idx >= 0 ? list[idx] : null;
    const mergedRoles = Array.from(
      new Set([
        ...(existing?.roles || []),
        ...(user.roles || []),
        ...(user.role ? [user.role] : []),
        ...(existing?.role ? [existing.role] : []),
      ]),
    ).filter(Boolean);

    const updatedUser: KnownUser = {
      user_id: user.user_id || existing?.user_id || `usr_${Date.now()}`,
      full_name: user.full_name || existing?.full_name || null,
      email: user.email || existing?.email || null,
      document: user.document || existing?.document || null,
      phone: user.phone || existing?.phone || null,
      roles: mergedRoles.length > 0 ? mergedRoles : ["patient"],
      clinic_name: user.clinic_name || existing?.clinic_name || null,
      created_at: user.created_at || existing?.created_at || new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updatedUser;
    } else {
      list.push(updatedUser);
    }
    localStorage.setItem("protesepay_system_users", JSON.stringify(list));
  } catch (err) {
    console.error("Error recording user:", err);
  }
}

export function getKnownUsers(): KnownUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("protesepay_system_users");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

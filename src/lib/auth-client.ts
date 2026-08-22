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

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function setAccountAsClinic(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("user_role_hint", "clinic");
      localStorage.setItem(`user_role_${user.id}`, "clinic");
    }

    await supabase.from("profiles").update({ role: "clinic" }).eq("user_id", user.id);

    try {
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "clinic" });
    } catch {
      // Ignore if constraint error
    }

    try {
      await supabase.auth.updateUser({
        data: { role: "clinic" },
      });
    } catch {
      // Ignore
    }
  } catch (err) {
    console.error("Error setting account as clinic:", err);
  }
}

export async function getAuthenticatedUserRole(): Promise<"patient" | "clinic" | "admin"> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "patient";

    console.log("[Auth] Checking role for user:", user.email, "metadata:", user.user_metadata);

    // 1. Check user_metadata
    const metaRole = (user.user_metadata?.role as string)?.toLowerCase();
    if (metaRole === "admin") return "admin";
    if (metaRole === "clinic" || metaRole === "clinica") {
      await setAccountAsClinic().catch(() => { });
      return "clinic";
    }
    if (user.user_metadata?.clinic_name || user.user_metadata?.tipo === "clinica") {
      await setAccountAsClinic().catch(() => { });
      return "clinic";
    }

    // 2. Check RPC has_role
    try {
      const { data: isAdminRpc } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (isAdminRpc) return "admin";

      const { data: isClinicRpc } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "clinic",
      });
      if (isClinicRpc) return "clinic";
    } catch {
      // Ignore if RPC fails
    }

    // 3. Check user_roles table
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesData && rolesData.length > 0) {
      const roles = rolesData.map((r) => String(r.role).toLowerCase());
      if (roles.includes("admin")) return "admin";
      if (roles.includes("clinic") || roles.includes("clinica")) return "clinic";
    }

    // 4. Check profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      const pRole = String(profile.role).toLowerCase();
      if (pRole === "admin") return "admin";
      if (pRole === "clinic" || pRole === "clinica") return "clinic";

      const docClean = (profile.document || "").replace(/\D/g, "");
      if (docClean.length === 14) {
        await setAccountAsClinic().catch(() => { });
        return "clinic";
      }

      const nameLower = (profile.full_name || "").toLowerCase();
      if (
        nameLower.includes("clínica") ||
        nameLower.includes("clinica") ||
        nameLower.includes("ortopedia") ||
        nameLower.includes("ortopédic")
      ) {
        await setAccountAsClinic().catch(() => { });
        return "clinic";
      }
    }

    // 5. Check clinic_affiliations table
    const { data: affiliations } = await supabase
      .from("clinic_affiliations")
      .select("id")
      .eq("user_id", user.id);

    if (affiliations && affiliations.length > 0) return "clinic";

    // 6. Check clinics table by email or email naming pattern
    if (user.email) {
      const { data: clinicByEmail } = await supabase
        .from("clinics")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (clinicByEmail) {
        await setAccountAsClinic().catch(() => { });
        return "clinic";
      }

      const emailLower = user.email.toLowerCase();
      if (
        emailLower.includes("clinic") ||
        emailLower.includes("clinica") ||
        emailLower.includes("ortopedia")
      ) {
        await setAccountAsClinic().catch(() => { });
        return "clinic";
      }
    }

    // 7. Check localStorage hint if set on this device
    if (typeof window !== "undefined") {
      const savedHint =
        localStorage.getItem(`user_role_${user.id}`) || localStorage.getItem("user_role_hint");
      if (savedHint === "clinic") {
        await setAccountAsClinic().catch(() => { });
        recordKnownUser({
          user_id: user.id,
          email: user.email,
          full_name: profile?.full_name || (user.user_metadata?.full_name as string) || null,
          document: profile?.document || (user.user_metadata?.document as string) || null,
          phone: profile?.phone || (user.user_metadata?.phone as string) || null,
          role: "clinic",
          clinic_name: (user.user_metadata?.clinic_name as string) || null,
          created_at: profile?.created_at || user.created_at,
        });
        return "clinic";
      }
    }

    recordKnownUser({
      user_id: user.id,
      email: user.email,
      full_name: profile?.full_name || (user.user_metadata?.full_name as string) || null,
      document: profile?.document || (user.user_metadata?.document as string) || null,
      phone: profile?.phone || (user.user_metadata?.phone as string) || null,
      role: "patient",
      clinic_name: (user.user_metadata?.clinic_name as string) || null,
      created_at: profile?.created_at || user.created_at,
    });
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

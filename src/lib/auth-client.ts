/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

export interface SignUpInput {
  email: string;
  password?: string;
  fullName: string;
  document: string;
  phone: string;
  zipCode?: string;
  address?: string;
  city?: string;
  state: string;
  role: "patient" | "clinic" | "admin";
  clinicName?: string;
}

export async function completeSignup(input: Omit<SignUpInput, "email" | "password">) {
  const { error } = await supabase.rpc("complete_signup" as any, {
    _full_name: input.fullName,
    _document: input.document,
    _phone: input.phone,
    _role: input.role,
    _clinic_name: input.clinicName || "",
    _zip_code: input.zipCode || "",
    _address: input.address || "",
    _city: input.city || "",
    _state: input.state || "",
  });
  if (error) throw new Error(error.message);

  if (input.role === "clinic") {
    await setAccountAsClinic().catch(() => {});
    if (input.zipCode || input.address || input.city) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: affiliations } = await supabase
          .from("clinic_affiliations")
          .select("clinic_id")
          .eq("user_id", user.id);
        if (affiliations && affiliations[0]) {
          await supabase
            .from("clinics")
            .update({
              zip_code: input.zipCode,
              address: input.address,
              city: input.city,
            })
            .eq("id", affiliations[0].clinic_id);
        }
      }
    }
  }
}

export async function signUpWithPassword(input: SignUpInput) {
  if (!input.password) {
    throw new Error("Password is required for sign up");
  }

  // Save the intended role to localStorage IMMEDIATELY, before any async operations.
  // This is the ONLY reliable source of truth because:
  // 1. GoTrue strips the 'role' field from user_metadata
  // 2. The database trigger defaults to 'patient'
  // 3. RLS policies block user_roles updates for non-admins
  if (typeof window !== "undefined" && input.role === "clinic") {
    localStorage.setItem("pending_signup_role", "clinic");
    localStorage.setItem("user_role_hint", "clinic");
    localStorage.setItem(`user_role_email_${input.email.toLowerCase().trim()}`, "clinic");
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
      data: {
        full_name: input.fullName,
        document: input.document,
        phone: input.phone,
        zip_code: input.zipCode,
        address: input.address,
        city: input.city,
        state: input.state,
        role: input.role,
        app_role: input.role,
        tipo: input.role,
        clinic_name: input.clinicName,
      },
    },
  });
  if (error) throw new Error(error.message);

  if (data.user && input.role === "clinic" && typeof window !== "undefined") {
    localStorage.setItem(`user_role_${data.user.id}`, "clinic");
  }

  let session = data.session;
  if (!session) {
    try {
      const signInRes = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (signInRes.data?.session) {
        session = signInRes.data.session;
      }
    } catch {
      // requires email confirmation
    }
  }

  if (session) {
    if (input.role !== "admin") {
      try {
        await completeSignup(input);
      } catch (e) {
        console.warn("[Auth] completeSignup RPC failed:", e);
      }
    }
    if (input.role === "clinic") {
      await setAccountAsClinic().catch(() => {});
    }
    return { needsEmailConfirmation: false as const };
  }
  return { needsEmailConfirmation: true as const };
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined" && data.user) {
    const metaRole = (data.user.user_metadata?.role as string)?.toLowerCase();
    if (metaRole === "admin") {
      localStorage.removeItem("user_role_hint");
      localStorage.removeItem("pending_signup_role");
      return data;
    }
    const emailRole = localStorage.getItem(`user_role_email_${email.toLowerCase().trim()}`);
    if (emailRole === "clinic") {
      localStorage.setItem(`user_role_${data.user.id}`, "clinic");
      setAccountAsClinic().catch(() => {});
    }
  }
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

    // Never convert an admin account to a clinic!
    const metaRole = (user.user_metadata?.role as string)?.toLowerCase();
    if (metaRole === "admin") return;

    if (typeof window !== "undefined") {
      localStorage.setItem(`user_role_${user.id}`, "clinic");
    }

    // Use SECURITY DEFINER RPC to bypass RLS (user_roles only allows admin inserts)
    const { error: rpcError } = await supabase.rpc("set_own_role_to_clinic" as any);
    if (rpcError) {
      console.warn(
        "[Auth] set_own_role_to_clinic RPC failed, falling back to direct updates:",
        rpcError.message,
      );
      // Fallback: try direct updates (may fail silently due to RLS)
      await supabase.from("profiles").update({ role: "clinic" }).eq("user_id", user.id);
      try {
        await supabase.from("user_roles").upsert({ user_id: user.id, role: "clinic" });
      } catch {
        // Ignore if constraint error
      }
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

    if (typeof window !== "undefined") {
      const pendingRole = localStorage.getItem("oauth_signup_role");
      if (pendingRole) {
        if (pendingRole === "clinic") {
          await setAccountAsClinic().catch(() => {});
          // If we just updated it, we can return clinic directly to avoid race conditions
          // where the session hasn't been reloaded yet in this function execution
          return "clinic";
        }
        localStorage.removeItem("oauth_signup_role");
      }
    }

    // ========================================================
    // PRIORITY 0: ADMIN CHECK (Must ALWAYS take precedence!)
    // If the account is an admin, it must NEVER be overridden!
    // ========================================================
    const metaRole = (user.user_metadata?.role as string)?.toLowerCase();
    if (metaRole === "admin") {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_role_hint");
        localStorage.removeItem("pending_signup_role");
      }
      return "admin";
    }

    try {
      const { data: isAdminRpc } = await supabase.rpc("has_role" as any, {
        _user_id: user.id,
        _role: "admin",
      });
      if (isAdminRpc) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_role_hint");
          localStorage.removeItem("pending_signup_role");
        }
        return "admin";
      }
    } catch {
      // ignore error
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesData && rolesData.length > 0) {
      const roles = rolesData.map((r) => String(r.role).toLowerCase());
      if (roles.includes("admin")) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_role_hint");
          localStorage.removeItem("pending_signup_role");
        }
        return "admin";
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile && String(profile.role).toLowerCase() === "admin") {
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_role_hint");
        localStorage.removeItem("pending_signup_role");
      }
      return "admin";
    }

    // ========================================================
    // PRIORITY 1: CLINIC CHECK
    // ========================================================
    if (typeof window !== "undefined") {
      const pendingRole = localStorage.getItem("pending_signup_role");
      const userSpecificRole = localStorage.getItem(`user_role_${user.id}`);
      const emailSpecificRole = user.email
        ? localStorage.getItem(`user_role_email_${user.email.toLowerCase().trim()}`)
        : null;

      if (
        pendingRole === "clinic" ||
        userSpecificRole === "clinic" ||
        emailSpecificRole === "clinic"
      ) {
        console.log("[Auth] User-specific hint indicates clinic! Returning clinic.");
        localStorage.setItem(`user_role_${user.id}`, "clinic");
        if (user.email) {
          localStorage.setItem(`user_role_email_${user.email.toLowerCase().trim()}`, "clinic");
        }
        localStorage.removeItem("pending_signup_role");
        localStorage.removeItem("user_role_hint");
        setAccountAsClinic().catch(() => {});
        return "clinic";
      }
    }

    if (!profile && user.user_metadata) {
      try {
        console.log("[Auth] Attempting profile recovery...");
        await completeSignup({
          fullName: user.user_metadata.full_name || user.user_metadata.name || "",
          document: user.user_metadata.document || "",
          phone: user.user_metadata.phone || "",
          zipCode: user.user_metadata.zip_code || "",
          address: user.user_metadata.address || "",
          city: user.user_metadata.city || "",
          role: user.user_metadata.role || "patient",
          clinicName: user.user_metadata.clinic_name,
          state: user.user_metadata.state || "",
        });
      } catch (e) {
        console.error("Failed to recover user profile", e);
      }
    }

    const appRole = (user.user_metadata?.app_role as string)?.toLowerCase();
    const tipo = (user.user_metadata?.tipo as string)?.toLowerCase();
    if (
      metaRole === "clinic" ||
      metaRole === "clinica" ||
      appRole === "clinic" ||
      tipo === "clinic" ||
      tipo === "clinica" ||
      user.user_metadata?.tipo === "clinica"
    ) {
      console.log("[Auth] User metadata matches clinic! Returning clinic.");
      await setAccountAsClinic().catch(() => {});
      return "clinic";
    }

    try {
      const { data: isClinicRpc } = await supabase.rpc("has_role" as any, {
        _user_id: user.id,
        _role: "clinic",
      });
      if (isClinicRpc) return "clinic";
    } catch {
      // ignore error
    }

    if (rolesData && rolesData.length > 0) {
      const roles = rolesData.map((r) => String(r.role).toLowerCase());
      if (roles.includes("clinic") || roles.includes("clinica")) return "clinic";
    }

    if (
      profile &&
      (String(profile.role).toLowerCase() === "clinic" ||
        String(profile.role).toLowerCase() === "clinica")
    ) {
      return "clinic";
    }

    const { data: affiliations } = await supabase
      .from("clinic_affiliations")
      .select("id")
      .eq("user_id", user.id);

    if (affiliations && affiliations.length > 0) return "clinic";

    if (user.email) {
      const { data: clinicByEmail } = await supabase
        .from("clinics")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      if (clinicByEmail) {
        await setAccountAsClinic().catch(() => {});
        return "clinic";
      }
    }

    recordKnownUser({
      user_id: user.id,
      email: user.email,
      full_name: profile?.full_name || (user.user_metadata?.full_name as string) || null,
      document: profile?.document || (user.user_metadata?.document as string) || null,
      phone: profile?.phone || (user.user_metadata?.phone as string) || null,
      address: (profile as any)?.address || (user.user_metadata?.address as string) || null,
      city: (profile as any)?.city || (user.user_metadata?.city as string) || null,
      zip_code: (profile as any)?.zip_code || (user.user_metadata?.zip_code as string) || null,
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
  address?: string | null;
  city?: string | null;
  zip_code?: string | null;
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
      address: user.address || existing?.address || null,
      city: user.city || existing?.city || null,
      zip_code: user.zip_code || existing?.zip_code || null,
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

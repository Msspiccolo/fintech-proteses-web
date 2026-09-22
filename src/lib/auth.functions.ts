import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

    return { profile: data, roles: roles?.map((r: { role: string }) => r.role) ?? [] };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
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

export const getAllUsersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");

    // Fetch all profiles using service role key to bypass RLS
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Fetch all auth users using raw fetch to avoid issues with client.server.ts custom fetch
    // stripping the Authorization header which GoTrue requires
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch auth users: ${response.statusText}`);
    }
    
    const authData = await response.json();
    const authUsers = authData.users || [];

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*");

    if (profilesError) throw new Error(profilesError.message);

    // Fetch all roles to map to profiles
    const { data: allRoles, error: allRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("*");

    if (allRolesError) throw new Error(allRolesError.message);

    const users = authUsers.map((authUser) => {
      const profile = (profiles || []).find((p: any) => p.user_id === authUser.id);
      const userRoles = (allRoles || [])
        .filter((r: any) => r.user_id === authUser.id)
        .map((r: any) => r.role);
        
      const rawMeta = authUser.user_metadata || {};
      const fallbackRole = rawMeta.role || "patient";
      
      return {
        user_id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || rawMeta.full_name || rawMeta.name || "",
        document: profile?.document || rawMeta.document || "",
        phone: profile?.phone || rawMeta.phone || authUser.phone || "",
        role: profile?.role || fallbackRole,
        roles: userRoles.length > 0 ? userRoles : [profile?.role || fallbackRole],
        created_at: authUser.created_at,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { users };
  });

export const updateUserRoleForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        newRole: z.enum(["patient", "clinic", "admin"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.targetUserId);

    if (deleteError) throw new Error(deleteError.message);

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.targetUserId, role: data.newRole });

    if (insertError) throw new Error(insertError.message);

    // Update profiles role as well to keep them in sync
    await supabaseAdmin
      .from("profiles")
      .update({ role: data.newRole })
      .eq("user_id", data.targetUserId);

    return { ok: true };
  });

export const deleteUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");

    // Call the RPC
    const { error } = await context.supabase.rpc("delete_user_by_admin", {
      target_user_id: data.targetUserId,
    });

    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("delete_own_account");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

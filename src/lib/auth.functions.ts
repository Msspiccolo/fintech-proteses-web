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
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) throw new Error(rolesError.message);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized");

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) throw new Error(profilesError.message);

    // Fetch all roles to map to profiles
    const { data: allRoles, error: allRolesError } = await context.supabase
      .from("user_roles")
      .select("*");

    if (allRolesError) throw new Error(allRolesError.message);

    const users = (profiles || []).map((p: any) => {
      const userRoles = (allRoles || [])
        .filter((r: any) => r.user_id === p.user_id)
        .map((r: any) => r.role);
      return { ...p, roles: userRoles };
    });

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
    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) throw new Error(rolesError.message);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized");

    // First delete existing role for user
    const { error: deleteError } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.targetUserId);

    if (deleteError) throw new Error(deleteError.message);

    // Insert new role
    const { error: insertError } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.targetUserId, role: data.newRole });

    if (insertError) throw new Error(insertError.message);

    // Update profiles role as well to keep them in sync
    await context.supabase
      .from("profiles")
      .update({ role: data.newRole })
      .eq("user_id", data.targetUserId);

    return { ok: true };
  });

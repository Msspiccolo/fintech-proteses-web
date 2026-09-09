import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getDB, saveDB } from "./mock-db";

export const mockLogin = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ email: z.string(), password: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const db = getDB();
    const user = db.users.find(u => u.email === data.email);
    if (!user) throw new Error("Usuário não encontrado");
    if (user.password && user.password !== data.password) throw new Error("Senha incorreta");
    
    // Return a mock token, here we'll just use the user ID as the token
    return { token: user.id, user };
  });

export const mockSignup = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      email: z.string(),
      password: z.string(),
      fullName: z.string(),
      role: z.enum(["patient", "clinic", "admin"]),
      document: z.string().optional(),
      phone: z.string().optional()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const db = getDB();
    if (db.users.find(u => u.email === data.email)) throw new Error("Email já cadastrado");

    const newUser = {
      id: `mock-user-${Date.now()}`,
      email: data.email,
      password: data.password,
      full_name: data.fullName,
      role: data.role,
      document: data.document ?? null,
      phone: data.phone ?? null,
      created_at: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDB(db);

    return { token: newUser.id, user: newUser };
  });

export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const user = db.users.find((u) => u.id === context.userId);
    if (!user) throw new Error("User not found");
    
    return { 
      profile: {
        user_id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        document: user.document,
        role: user.role
      }, 
      roles: [user.role] 
    };
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
    const db = getDB();
    const userIndex = db.users.findIndex((u) => u.id === context.userId);
    if (userIndex >= 0) {
      db.users[userIndex] = {
        ...db.users[userIndex],
        full_name: data.fullName ?? db.users[userIndex].full_name,
        phone: data.phone ?? db.users[userIndex].phone,
      };
      saveDB(db);
    }
    return { ok: true };
  });

export const getAllUsersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = getDB();
    const currentUser = db.users.find(u => u.id === context.userId);
    if (currentUser?.role !== "admin") throw new Error("Unauthorized");

    const users = db.users.map(u => ({
      ...u,
      user_id: u.id,
      roles: [u.role]
    }));

    return { users };
  });

export const updateUserRoleForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        targetUserId: z.string(),
        newRole: z.enum(["patient", "clinic", "admin"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = getDB();
    const currentUser = db.users.find(u => u.id === context.userId);
    if (currentUser?.role !== "admin") throw new Error("Unauthorized");

    const targetUser = db.users.find(u => u.id === data.targetUserId);
    if (targetUser) {
      targetUser.role = data.newRole;
      saveDB(db);
    }
    return { ok: true };
  });

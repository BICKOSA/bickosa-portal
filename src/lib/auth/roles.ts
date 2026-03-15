import { z } from "zod";

export const APP_USER_ROLES = ["member", "admin"] as const;
export const DEFAULT_APP_USER_ROLE = "member";
export const ADMIN_APP_ROLES = ["admin"] as const;

export const appUserRoleSchema = z.enum(APP_USER_ROLES);

export type AppUserRole = z.infer<typeof appUserRoleSchema>;

/**
 * Better Auth docs and examples often use "user" as the default role.
 * Our canonical non-admin role is "member", so we normalize legacy input.
 */
export function normalizeUserRole(value: unknown): AppUserRole {
  if (value === "user") {
    return DEFAULT_APP_USER_ROLE;
  }

  const parsed = appUserRoleSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return DEFAULT_APP_USER_ROLE;
}

export function isAdminUserRole(value: unknown): boolean {
  return normalizeUserRole(value) === "admin";
}


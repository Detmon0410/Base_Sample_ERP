import { z } from "zod";

// Messages are i18n keys; they are translated when shown.
const REQUIRED = "master:validation.required";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** At least 8 characters with a letter and a digit (the same rule as the server). */
export const isStrongPassword = (value) => typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

const membership = z.object({ department: z.string(), role: z.string().min(1, "users:validation.pick") });

function checkMemberships(rows, context) {
  const seen = new Set();
  rows.forEach((row, index) => {
    if (row.role !== "Admin" && !row.department) context.addIssue({ code: "custom", path: [index, "department"], message: "users:validation.pick" });
    if (row.role === "Admin" && rows.length > 1) context.addIssue({ code: "custom", path: [index, "role"], message: "users:validation.adminAlone" });
    if (row.role !== "Admin" && row.department) {
      if (seen.has(row.department)) context.addIssue({ code: "custom", path: [index, "department"], message: "users:validation.duplicate" });
      seen.add(row.department);
    }
  });
}

const base = {
  name: z.string().trim().min(1, REQUIRED).max(100, "master:validation.maxLength"),
  email: z.string().trim().min(1, REQUIRED).max(100, "master:validation.maxLength").refine((value) => EMAIL.test(value), "master:validation.emailInvalid"),
  memberships: z.array(membership).min(1, "users:validation.assignmentsRequired").superRefine(checkMemberships),
};

/** The form of a new user asks for a password; a saved user is changed without one (Reset password is separate). */
export const newUserSchema = z.object({ ...base, password: z.string().refine(isStrongPassword, "users:validation.weakPassword") });
export const userSchema = z.object({ ...base, password: z.string() });

export const EMPTY_USER = { name: "", email: "", password: "", memberships: [{ department: "", role: "Worker" }] };

export function toFormValues(user) {
  return {
    name: user.name ?? "",
    email: user.email ?? "",
    password: "",
    memberships: (user.memberships ?? []).map((row) => ({ department: row.department ?? "", role: row.role })),
  };
}

/** Admin has no department; the password is only sent for a new user. */
export function toPayload(values) {
  const { password, ...rest } = values;
  return {
    ...rest,
    ...(password ? { password } : {}),
    memberships: values.memberships.map((row) => ({ department: row.role === "Admin" ? null : row.department, role: row.role })),
  };
}

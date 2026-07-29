import { z } from 'zod'

export const signup = z.object({
    name: z.string({ error: "Name is required" })
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name cannot exceed 100 characters"),

    email: z.string({ error: "Email is required" })
        .trim()
        .lowercase()
        .email("Invalid email address"),

    password: z.string({ error: "Password is required" })
        .min(6, "Password must be at least 6 characters"),

    phone: z.string({ error: "Phone number is required" })
        .trim()
        .min(10, "Invalid phone number"),

    role: z.enum(USER_ROLES).default("CUSTOMER"),

    isVerified: z.boolean().default(false),
});

export const login = z.object({

    email: z.string({ error: "Email is required" })
        .trim()
        .lowercase()
        .email("Invalid email address"),

    password: z.string({ error: "Password is required" })
});
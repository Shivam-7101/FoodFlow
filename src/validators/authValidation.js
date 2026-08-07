import { z } from 'zod'
import * as constants from '../constants.js'
import { isValidObjectId } from 'mongoose'

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

    role: z.enum(constants.USER_ROLE).default("CUSTOMER"),

    isVerified: z.boolean().default(false),
});

export const login = z.object({

    email: z.string({ error: "Email is required" })
        .trim()
        .lowercase()
        .email("Invalid email address"),

    password: z.string({ error: "Password is required" }),
    deviceId: z.string().trim().min(3)
});

export const changePassword = z.object({
    oldPassword: z.string({ error: "old password is required" }).trim(),
    newPassword: z.string({ error: "Password is required" }).min(6, "Password must be at least 6 characters")
})
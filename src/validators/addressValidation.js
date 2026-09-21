import { z } from 'zod'

export const address = z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(13),
    addressLine1: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(50),
    state: z.string().trim().min(1).max(50),
    country: z.string().trim().min(1).max(50),
    postalCode: z.string().trim().min(1).max(50),
    coordinates: z.array(z.number())
})

export const deleteAddress = z.object({
    addressLine1: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(50),
    state: z.string().trim().min(1).max(50),
})
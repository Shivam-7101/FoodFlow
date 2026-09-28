import { z } from 'zod'
import * as constants from '../constants.js'

export const address = z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(10).max(13),
    addressLine1: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(50),
    state: z.string().trim().min(1).max(50),
    country: z.string().trim().min(1).max(50),
    postalCode: z.string().trim().min(1).max(50),
    coordinates: z.array(z.number()).length(2, { error: 'coordinates array length should not exceed 2.' }),
    paymentMethod: z.enum(constants.PAYMENT_METHOD)
})
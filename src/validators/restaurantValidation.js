import { z } from 'zod'
import { isValidObjectId } from 'mongoose'


export const createRestaurant = z.object({
    name: z.string().trim().min(3).max(100),
    description: z.string().trim().min(3).max(1000),
    address: z.object({
        addressLine1: z.string().trim().min(3),
        addressLine2: z.string().trim().min(3).optional(),
        city: z.string().trim().min(1, { error: 'city is an required field' }),
        state: z.string().trim().min(1, { error: 'state is an required field' }),
        country: z.string().trim().min(1, { error: 'country is an required field' }),
        postalCode: z.string().trim().min(1, { error: 'postal code is an required field' })
    }),
    openingHours: z.object({
        open: z.string().trim().min(1, { error: 'opening time is an required field' }),
        close: z.string().trim().min(1, { error: 'closing time is an required field' }),
    }),
    minimumOrderAmount: z.coerce.number().min(1),
    deliveryFee: z.coerce.number().min(1),
})
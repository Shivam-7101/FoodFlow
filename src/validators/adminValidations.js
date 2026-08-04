import { z } from 'zod'
import { isValidObjectId } from 'mongoose'

export const updateUserToInactive = z.object({
    body: z.refine(val => isValidObjectId(val), { error: 'Invalid mongoose object id' })
})

export const removeRestaurantOwnerStatus = z.object({
    body: z.refine(val => isValidObjectId(val), { error: 'Invalid mongoose object id' }),
})

export const removeDeliveryPartnerStatus = z.object({
    body: z.refine(val => isValidObjectId(val), { error: 'Invalid mongoose object id' }),
})
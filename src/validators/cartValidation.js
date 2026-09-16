import { z } from 'zod'
import { isValidObjectId } from 'mongoose'

export const addOrRemoveItemInCart = z.object({
    // 1. Tell Zod it's a string, then refine it
    restaurantId: z.string().refine((v) => isValidObjectId(v), { message: 'invalid restaurant id.' }),
    foodId: z.string().refine((v) => isValidObjectId(v), { message: 'invalid food id.' }),
    foodVariantId: z.string().refine((v) => isValidObjectId(v), { message: 'invalid food variant id.' }),

    // 2. For optional fields, make sure the string itself is optional before refining
    cartId: z.string().optional().refine((v) => !v || isValidObjectId(v), { message: 'invalid cart id.' }),

    quantity: z.coerce.number().min(-1).max(1)
})

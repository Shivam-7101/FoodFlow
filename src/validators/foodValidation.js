import { z } from 'zod'

export const createFood = z.object({

    category: z.string().trim().min(1),
    name: z.string().trim().min(3),
    description: z.string().trim().min(5).max(200),
    isVeg: z.preprocess((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return false
    }, z.boolean()),
    isAvailable: z.preprocess((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return false
    }, z.boolean()),

    variants: z.array(z.object({
        name: z.string().trim().min(3),
        attributes: z.array(z.object({
            name: z.string().trim().min(3),
            value: z.string().trim().min(3)
        })),
        price: z.object({
            originalPrice: z.coerce.number().min(0),
            sellingPrice: z.coerce.number().min(0)
        }),
        stock: z.coerce.number().min(0)
    })),
})

export const updateFood = z.object({
    category: z.string().trim().min(1),
    name: z.string().trim().min(3),
    description: z.string().trim().min(5).max(200),
    isVeg: z.preprocess((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return false
    }, z.boolean()),
    isAvailable: z.preprocess((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return false
    }, z.boolean()),
    images: z.array(z.object({
        public_id: z.string().trim().min(1),
        secure_url: z.string().trim().min(1)
    })).optional(),
    variants: z.array(z.object({
        _id: z.string().trim().min(1).optional(),
        name: z.string().trim().min(3),
        attributes: z.array(z.object({
            name: z.string().trim().min(3),
            value: z.string().trim().min(3)
        })),
        price: z.object({
            originalPrice: z.coerce.number().min(0),
            sellingPrice: z.coerce.number().min(0)
        }),
        stock: z.coerce.number().min(0),
        isActive: z.preprocess((val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return false
        }, z.boolean())
    })).optional(),
})
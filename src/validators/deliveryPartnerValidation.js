import { z } from 'zod'
import * as constants from '../constants.js'

export const createDeliveryPartner = z.object({
    vehicleType: z.enum(constants.VEHICLE_TYPE),
    vehicleNumber: z.string().trim().min(1).max(50).toUpperCase(),
    coordinates: z.array(z.coerce.number(), { error: 'ZOD VALIDATION ERR: INVALID COORDINATES' }),
})

export const updateDeliveryPartner = z.object({
    vehicleType: z.enum(constants.VEHICLE_TYPE),
    vehicleNumber: z.string().trim().min(1).max(50).toUpperCase(),
})
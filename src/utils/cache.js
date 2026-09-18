import { cache } from '../config/cache.js'

export const getCart = ({ userId = null }) => {
    return cache.getCart({ userId })
}

export const getFood = ({ foodId = null }) => {
    return cache.getFood({ foodId })
}

export const getRestaurant = ({ restaurantId = null }) => {
    return cache.getRestaurant({ restaurantId })
}

export const invalidateCart = async ({ cartId }) => {
    await cache.invalidateAll(`cart:${cartId?.toString()}`)
}

export const invalidateRestaurant = async ({ restaurantId }) => {
    await cache.invalidateAll(`restaurant:${restaurantId?.toString()}`)
}

export const invalidateFood = async ({ foodId }) => {
    await cache.invalidateAll(`food:${foodId?.toString()}`)
}
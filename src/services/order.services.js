import * as orderValidation from '../validators/orderValidation.js'
import * as addressValidation from '../validators/addressValidation.js'
import * as utils from '../utils/index.js'
import { FoodVariant, Order } from '../models/index.js'
import { ErrorCodes, ForbiddenError, NotFoundError, ValidationError, BadRequestError } from '../errors/index.js'
import mongoose from 'mongoose'

export const createOrder = async ({ user, body }) => {

    body.coordinates = JSON.parse(body.coordinates)
    const result = addressValidation.address.safeParse(body)
    if (!result.success) throw new ValidationError(`ORDER VALIDATION ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);

    const cart = await utils.cache.getCart({ userId: user._id })
    if (!cart.status) throw new NotFoundError(ErrorCodes.CART.CART_EMPTY);

    const restaurant = await utils.cache.getRestaurant({ restaurantId: cart.data.restaurantId })
    if (!restaurant.status) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
    if (!restaurant.data.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);
    if (!restaurant.data.isOpen) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_CLOSED);

    const cartItems = await Promise.all(cart.data.items.map(item => utils.cache.getFood({ foodId: item.foodId })))

    const foodItemsToBeOrder = [], foodVariantsBulkOperations = [], reverseBulkOperation = []
    let summary = { totalItems: cartItems.length, deliveryFee: restaurant.data.deliveryFee, subtotal: 0, tax: restaurant.data.tax, discount: 0 }
    const shippingAddress = {
        fullName: result.data.fullName,
        phone: result.data.phone,
        addressLine1: result.data.addressLine1,
        addressLine2: result.data?.addressLine2 ?? "",
        city: result.data.city,
        state: result.data.state,
        country: result.data.country,
        postalCode: result.data.postalCode,
        location: {
            coordinates: result.data.coordinates
        }
    }

    for (let i = 0; i < cartItems.length; i++) {

        const foodDetails = cartItems[i]
        const itemDetails = cart.data.items[i]
        if (!foodDetails.status) throw new NotFoundError(ErrorCodes.FOOD.FOOD_NOT_FOUND);
        if (!foodDetails.data.isActive) throw new ForbiddenError(ErrorCodes.FOOD.FOOD_NOT_ACTIVE);

        const variant = foodDetails.data.variants?.find(item => item._id?.toString() === itemDetails?.foodVariantId?.toString())
        if (!variant) throw new NotFoundError(ErrorCodes.FOOD.VARIANT_NOT_FOUND);
        if (!variant.isActive) throw new ForbiddenError(ErrorCodes.FOOD.VARIANT_NOT_ACTIVE);
        if (variant.stock < itemDetails.quantity) throw new ForbiddenError(ErrorCodes.FOOD.OUT_OF_STOCK);

        summary.subtotal += variant.price.sellingPrice * itemDetails.quantity

        foodItemsToBeOrder.push({
            foodId: foodDetails.data._id,
            variantId: variant._id,
            foodName: foodDetails.data.name,
            thumbnail: {
                public_id: foodDetails.data.images?.[0]?.public_id,
                secure_url: foodDetails.data.images?.[0]?.secure_url,
            },
            attributes: variant.attributes,
            quantity: itemDetails.quantity,
            priceAtPurchase: variant.price.sellingPrice,
            subtotal: variant.price.sellingPrice * itemDetails.quantity
        })

        foodVariantsBulkOperations.push({
            updateOne: {
                filter: {
                    _id: variant._id,
                    stock: {
                        $gte: itemDetails.quantity
                    }
                },
                update: {
                    $inc: {
                        stock: -itemDetails.quantity
                    }
                }
            }
        })

        reverseBulkOperation.push({
            updateOne: {
                filter: {
                    _id: variant._id
                },
                update: {
                    $inc: {
                        stock: itemDetails.quantity
                    }
                }
            }
        })
    }

    summary.grandTotal = summary.subtotal - summary.discount + summary.deliveryFee + ((summary.subtotal - summary.discount + summary.deliveryFee) * (summary.tax / 100))

    let createdOrder = null
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {

            const bulkWriteResult = await FoodVariant.bulkWrite(foodVariantsBulkOperations, { session })

            if (bulkWriteResult.matchedCount !== cartItems.length) {
                throw new BadRequestError(`CART ERR: Some items are out of stock. Please update your cart.`);
            }

            const order = await Order.create([{
                userId: user._id,
                restaurantId: restaurant.data._id,
                items: foodItemsToBeOrder,
                shippingAddress,
                summary,
                status: 'PENDING_PAYMENT'
            }], { session })

            createdOrder = order[0]
        })
    } catch (error) {

        const message = error instanceof Error ? error.message : error
        console.log(`ORDER CREATION ERR: ${message}`)
        throw error

    } finally {
        await session.endSession()
    }

    try {
        const razorpayOrder = await utils.createRazorpayOrderWithSafety({ amount: createdOrder.summary.grandTotal, bulkOperation: reverseBulkOperation, orderId: createdOrder._id })
        const updatedOrder = await Order.findByIdAndUpdate(createdOrder._id, { $set: { 'payment.providerOrderId': razorpayOrder.id } }, { returnDocument: 'after' })

        // console.log('RAZORPAY ORDER IN SERVICES: ', razorpayOrder)

        return { order: updatedOrder, razorpayOrder }
    } catch (error) {
        throw error
    }
}
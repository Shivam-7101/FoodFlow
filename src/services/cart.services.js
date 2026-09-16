import { User, Restaurant, Cart, Food, FoodVariant } from '../models/index.js'
import * as utils from '../utils/index.js'
import * as cartValidation from '../validators/cartValidation.js'
import { ErrorCodes, NotFoundError, BadRequestError, ConflictError, InternalServerError, ForbiddenError } from '../errors/index.js'
import * as mapper from '../mapper/index.js'
import mongoose from 'mongoose'

export const addOrRemoveItemInCart = async ({ body, user }) => {
    console.log('4. REQ BODY IN SERVICES: ', JSON.stringify(body, null, 2));

    const result = cartValidation.addOrRemoveItemInCart.safeParse(body || {});
    if (!result.success) {
        throw new BadRequestError(`CART ERR: ${result.error.issues.map(issue => issue.message).join(', ')}`);
    }

    const newFoodId = new mongoose.Types.ObjectId(result.data.foodId);
    const newFoodVariantId = new mongoose.Types.ObjectId(result.data.foodVariantId);
    const newRestaurantId = new mongoose.Types.ObjectId(result.data.restaurantId);

    const [isFoodExist, isRestaurantExist, isCartExists] = await Promise.all([
        utils.cache.getFood({ foodId: newFoodId }),
        utils.cache.getRestaurant({ restaurantId: newRestaurantId }),
        utils.cache.getCart({ userId: user._id })
    ]);

    if (!isFoodExist.status) throw new NotFoundError(ErrorCodes.FOOD.FOOD_NOT_FOUND);
    if (!isFoodExist.data.isActive) throw new ForbiddenError(ErrorCodes.FOOD.FOOD_NOT_ACTIVE);

    const matchingVariant = isFoodExist.data.variants.find(item => item._id.toString() === newFoodVariantId.toString());
    if (!matchingVariant || !matchingVariant.isActive) {
        throw new ForbiddenError(ErrorCodes.FOOD.VARIANT_NOT_ACTIVE);
    }

    if (!isRestaurantExist.status) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
    if (!isRestaurantExist.data.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

    console.log('EXISTING CART COMPLETE OBJECT: ', JSON.stringify(isCartExists, null, 2))
    // console.log('EXISTING CART STATUS: ', isCartExists.status)
    // console.log('EXISTING CART DATA: ', JSON.stringify(isCartExists.data, null, 2))

    let canChangeRestaurant = false
    if (isCartExists.status && isCartExists.data.items.length > 0) {
        if (isCartExists.data.restaurantId.toString() !== newRestaurantId.toString()) throw new BadRequestError(ErrorCodes.CART.DIFFERENT_RESTAURANT);
    } else {
        canChangeRestaurant = true
    }

    const cart = await Cart.findOneAndUpdate(
        {
            userId: user._id
        },
        [
            {
                $set: {
                    userId: { $ifNull: ['$userId', user._id] },
                    restaurantId: {
                        $cond: {
                            if: { $eq: [canChangeRestaurant, true] },
                            then: newRestaurantId,
                            else: { $ifNull: ['$restaurantId', newRestaurantId] }
                        }
                    },
                    items: {
                        $cond: {
                            if: {
                                $and: [
                                    { $isArray: '$items' },
                                    { $in: [{ $toObjectId: newFoodVariantId }, { $ifNull: ['$items.foodVariantId', []] }] }
                                ]
                            },
                            then: {
                                $map: {
                                    input: '$items',
                                    as: 'item',
                                    in: {
                                        $cond: {
                                            if: {
                                                $eq: [
                                                    { $toObjectId: newFoodVariantId },
                                                    '$$item.foodVariantId'
                                                ]
                                            },
                                            then: {
                                                $mergeObjects: [
                                                    '$$item',
                                                    { quantity: { $add: ['$$item.quantity', result.data.quantity] } }
                                                ]
                                            },
                                            else: '$$item'
                                        }
                                    }
                                }
                            },
                            else: {
                                $concatArrays: [
                                    { $ifNull: ['$items', []] },
                                    {
                                        $cond: {
                                            if: { $gt: [result.data.quantity, 0] },
                                            then: [{
                                                foodId: newFoodId,
                                                foodVariantId: newFoodVariantId,
                                                quantity: result.data.quantity
                                            }],
                                            else: []
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    items: {
                        $filter: {
                            input: '$items',
                            as: 'item',
                            cond: { $gt: ['$$item.quantity', 0] }
                        }
                    }
                }
            }
        ],
        {
            upsert: true,
            updatePipeline: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true
        }
    )

    if (isCartExists.status) {
        await utils.cache.invalidateCart({ cartId: isCartExists.data._id })
    }
    if (cart.items.length === 0) {
        await Cart.deleteOne({ userId: user._id })
        if (isCartExists.status) {
            await utils.cache.invalidateCart({ cartId: isCartExists.data._id })
        }
    }

    return mapper.cartMapper({ cart })
};

export const getCart = async ({ user, cartId }) => {
    const cart = await utils.cache.getCart({ userId: user._id })
    if (!cart.status) throw new NotFoundError(ErrorCodes.CART.CART_NOT_FOUND);
    return mapper.cartMapper({ cart: cart.data })
}

export const emptyCart = async ({ user, cartId }) => {
    const cart = await utils.cache.getCart({ userId: user._id })
    if (!cart.status) return;
    await Promise.all([utils.cache.invalidateCart({ cartId }), Cart.findOneAndDelete({ userId: user._id, _id: cartId })])
}
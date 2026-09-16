import { createCache } from 'async-cache-dedupe'
import superjson from 'superjson'
import { redis } from './redis.js'
import { Food, Restaurant, Cart } from '../models/index.js'
import mongoose, { isValidObjectId } from 'mongoose'
import { ErrorCodes, ValidationError } from '../errors/index.js'

export const cache = createCache({
    ttl: 150,
    // stale: 150,
    onDedupe: (key) => console.log(`FUNCTION DEDUPLICATED: ${key}`),
    onError: (error) => console.log(`CACHE ERROR: ${error}`),
    onHit: (key) => console.log(`CACHE HIT FOR FUNCTION: ${key}`),
    onMiss: (key) => console.log(`DATA NOT PRESENT IN CACHE. DB HIT FOR FUNCTION: ${key}`),
    storage: {
        type: 'redis',
        options: {
            client: redis,
            invalidation: {
                referencesTTL: 150
            }
        }
    },
    // ✅ FIXED: Wrapped superjson in string parsers so it outputs valid strings to Redis
    transformer: {
        serialize: (data) => JSON.stringify(superjson.serialize(data)),
        deserialize: (data) => superjson.deserialize(JSON.parse(data))
    }
});

cache.define('getCart',
    {
        ttl: (args, result) => {
            return result && result.status ? 150 : 0
        },
        // The signature receives (args, key, result)
        references: (args, key, result) => {
            // ✅ FIXED: Safely verify status and extract the ID string cleanly
            if (result && result.status && result.data?._id) {
                const referenceKey = `cart:${result.data._id.toString()}`;
                console.log(`CART REFERENCE ASSIGNED: ${referenceKey}`);
                return [referenceKey];
            }
            return [];
        }
    },
    async ({ userId }) => {
        if (!isValidObjectId(userId)) throw new Error(`CACHE ERR: Invalid user id`);

        const cart = await Cart.findOne({ userId }).lean();
        console.log('CART DETAILS AFTER HITTING DB: ', JSON.stringify(cart, null, 2));

        if (cart) {
            // Note: Returning lean objects rather than raw Mongoose hydration is highly recommended for caches
            return {
                status: true,
                message: 'Cart details fetched successfully.',
                data: cart
            };
        }

        return { status: false, message: "Cart not found" };
    }
);

cache.define('getRestaurant',
    {
        references: (args, key, result) => {
            // ✅ Safely extract the ID from the singular object payload
            if (result && result.status && result.data?._id) {
                return [`restaurant:${result.data._id.toString()}`];
            }
            return [];
        }
    },
    async ({ restaurantId }) => {
        if (!isValidObjectId(restaurantId)) throw new Error(`CACHE ERR: Invalid restaurant id`);

        // Added .lean() to store plain objects rather than heavy Mongoose document instances
        const restaurant = await Restaurant.findById(restaurantId).lean();

        if (!restaurant) return { status: false, message: 'restaurant not found.' };
        return { status: true, message: 'restaurant details fetched successfully.', data: restaurant };
    }
);

cache.define('getFood',
    {
        references: (args, key, result) => {
            // ✅ FIXED: Changed item._id to result.data._id to stop it from returning "food:undefined"
            if (result && result.status && result.data?._id) {
                return [`food:${result.data._id.toString()}`];
            }
            return [];
        }
    },
    async ({ foodId }) => {
        if (!isValidObjectId(foodId)) throw new Error(`CACHE ERR: Invalid food id`);

        const foodDetails = await Food.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(foodId)
                }
            },
            {
                $lookup: {
                    from: 'foodvariants',
                    let: { foodId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$foodId', '$$foodId'] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                foodId: 1,
                                name: 1,
                                attributes: 1,
                                price: 1,
                                stock: 1,
                                isActive: 1
                            }
                        }
                    ],
                    as: 'variants'
                }
            },
            {
                $project: {
                    restaurantId: 1,
                    _id: 1,
                    isActive: 1,
                    priceSummary: 1,
                    category: 1,
                    name: 1,
                    description: 1,
                    images: 1,
                    isVeg: 1,
                    isAvailable: 1,
                    variants: 1
                }
            }
        ]);

        if (foodDetails?.[0]) {
            return { status: true, message: 'food details fetched successfully.', data: foodDetails[0] };
        }

        return {
            status: false,
            message: 'food not found.'
        };
    }
);

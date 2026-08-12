import * as utils from '../utils/index.js'
import { Restaurant, Food, FoodVariant } from '../models/index.js'
import { ErrorCodes, NotFoundError, BadRequestError, ValidationError, UnauthorizedError, ForbiddenError } from '../errors/index.js'
import * as foodValidation from '../validators/foodValidation.js'
import mongoose from 'mongoose'
import * as mapper from '../mapper/index.js'
import ms from 'ms'

export const createFood = async ({ restaurantId, foodBody, files }) => {

    foodBody.variants = JSON.parse(foodBody.variants)
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
    if (restaurant.status !== 'ACTIVE' || !restaurant.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

    const result = foodValidation.createFood.safeParse(foodBody);
    if (!result.success) throw new ValidationError(ErrorCodes.VALIDATION.INVALID_INPUT);
    const data = result.data
    console.log(`ZOD PARSED VARIANTS: ${data.variants}`)

    const { food, variants } = await utils.withCloudinaryCleanup(async (trackUploads) => {

        if (!files || !files?.length) throw new BadRequestError(ErrorCodes.IMAGE.IMAGE_NOT_FOUND);
        const uploadedImages = await utils.cloudinary.uploadMany(files, 'foodImages')
        trackUploads(uploadedImages)

        const session = await mongoose.startSession()
        try {
            return await session.withTransaction(async () => {

                const createdFood = await Food.create([{
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    isVeg: data.isVeg,
                    isAvailable: data.isAvailable,
                    images: uploadedImages,
                    restaurantId: restaurant._id,
                    isActive: true
                }], { session })

                const variants = data.variants.map(item => ({
                    ...item, foodId: createdFood?.[0]._id, isActive: createdFood?.[0].isActive
                }))

                const createdVariants = await FoodVariant.create(
                    variants,
                    { session, ordered: true }
                )
                return { food: createdFood?.[0], variants: createdVariants }
            })
        } finally {
            await session.endSession()
        }
    })

    return { food: mapper.foodMapper(food), variants }
}

export const updateFood = async ({ restaurantId, foodId, foodBody, files }) => {

    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) throw new NotFoundError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_FOUND);
    if (restaurant.status !== 'ACTIVE' || !restaurant.isActive) throw new ForbiddenError(ErrorCodes.RESTAURANT.RESTAURANT_NOT_ACTIVE);

    const food = await Food.findById(foodId)
    if (!food) throw new NotFoundError(ErrorCodes.FOOD.FOOD_NOT_FOUND);
    if (!food.isActive || !food.isAvailable) throw new ForbiddenError(ErrorCodes.FOOD.FOOD_NOT_AVAILABLE);

    foodBody.variants = JSON.parse(foodBody.variants)
    foodBody.images = JSON.parse(foodBody.images || '[]')
    const result = foodValidation.updateFood.safeParse(foodBody);
    if (!result.success) throw new ValidationError(`Zod Validation Error: ${JSON.stringify(result.error.format())}`);
    const data = result.data

    const existingImages = new Set(data.images.map(image => image.public_id))
    const imagesToBeKeep = food.images.filter(image => existingImages.has(image.public_id))
    const imagesToBeDeleted = food.images.filter(image => !existingImages.has(image.public_id)).map(image => image.public_id)
    if (!(imagesToBeKeep.length + files.length)) throw new BadRequestError(ErrorCodes.IMAGE.IMAGE_IS_AN_REQUIRED_FIELD);

    const variantsToBeCreated = data.variants.filter(item => !item._id).map(item => ({ ...item, foodId: new mongoose.Types.ObjectId(foodId), isActive: food.isActive }))
    const existingVariants = new Set(data.variants.filter(item => item._id).map(item => item._id))
    const bulkVariantUpdate = data.variants.filter(item => item._id).map(item => ({
        updateOne: {
            filter: {
                _id: new mongoose.Types.ObjectId(item._id)
            },
            update: {
                $set: {
                    attributes: item.attributes,
                    isActive: item.isActive,
                    name: item.name,
                    price: item.price,
                    stock: item.stock
                }
            }
        }
    }))

    const { updatedFoodDetails, variants } = await utils.withCloudinaryCleanup(
        async (trackUploads) => {

            let uploadedImages = []
            if (files.length) {
                uploadedImages = await utils.cloudinary.uploadMany(files, 'foodImages')
                trackUploads(uploadedImages)
            }
            const finalImages = [...imagesToBeKeep, ...uploadedImages]

            const session = await mongoose.startSession()
            try {
                return await session.withTransaction(async () => {

                    const updatedFoodDetails = await Food.findByIdAndUpdate(
                        foodId,
                        {
                            name: data.name,
                            description: data.description,
                            category: data.category,
                            isVeg: data.isVeg,
                            isAvailable: data.isAvailable,
                            images: finalImages
                        },
                        {
                            returnDocument: 'after',
                            session
                        }
                    )

                    if (variantsToBeCreated && variantsToBeCreated.length > 0) {
                        await FoodVariant.insertMany(variantsToBeCreated, { session })
                    }

                    if (bulkVariantUpdate && bulkVariantUpdate.length > 0) {
                        await FoodVariant.bulkWrite(bulkVariantUpdate, { session, ordered: true });
                    }
                    // if (bulkVariantUpdate && bulkVariantUpdate.length > 0) {
                    //     try {
                    //         await FoodVariant.bulkWrite(
                    //             bulkVariantUpdate,
                    //             { session, ordered: true }
                    //         );
                    //     } catch (bulkError) {
                    //         // 🔍 This prints out the nested, hidden DB reason (e.g. duplicate keys, schema validation failures)
                    //         console.error("❌ --- DETAILED BULK WRITE ERROR START ---");
                    //         console.error(JSON.stringify(bulkError, null, 2));
                    //         console.error("❌ --- DETAILED BULK WRITE ERROR END ---");
                    //         throw bulkError;
                    //     }
                    // }


                    await FoodVariant.deleteMany(
                        {
                            foodId: new mongoose.Types.ObjectId(foodId),
                            _id: {
                                $nin: Array.from(existingVariants).map((id) => new mongoose.Types.ObjectId(id))
                            }
                        },
                        {
                            session
                        }
                    )
                    const variants = await FoodVariant.find({ foodId: new mongoose.Types.ObjectId(foodId) }, null, { session })
                    return { updatedFoodDetails, variants }
                })
            } catch (error) {
                console.error('Error during transaction:', error);
                throw error; // Rethrow the error to be handled by the outer try-catch
            } finally {
                await session.endSession()
            }
        })

    if (imagesToBeDeleted.length) {
        await utils.cloudinary.deleteMany(imagesToBeDeleted)
    }

    return { food: mapper.foodMapper(updatedFoodDetails), variants }
}

export const deleteFood = async ({ foodId }) => {

    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            const food = await Food.findByIdAndUpdate(
                foodId,
                {
                    $set: {
                        isActive: false,
                        expiresAt: new Date(Date.now() + ms('24h'))
                    }
                },
                {
                    returnDocument: 'after',
                    session
                }
            )

            if (!food) throw new NotFoundError(`${ErrorCodes.FOOD.FOOD_NOT_FOUND} OR already deleted`);

            await FoodVariant.updateMany(
                {
                    foodId
                },
                {
                    $set: {
                        isActive: false,
                        expiresAt: new Date(Date.now() + ms('24h'))
                    }
                },
                { session }
            )
        })
    } finally {
        await session.endSession()
    }
}

export const getFoodDetails = async ({ foodId }) => {

    const food = await Food.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(foodId),
                isActive: true
            }
        },
        {
            $lookup: {
                let: {
                    foodId: '$_id'
                },
                from: 'foodvariants',
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ['$foodId', '$$foodId']
                            },
                            isActive: true
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
                _id: 1,
                restaurantId: 1,
                isActive: 1,
                category: 1,
                name: 1,
                description: 1,
                images: 1,
                isVeg: 1,
                isAvailable: 1,
                variants: 1
            }
        }
    ])

    if (!food.length) throw new NotFoundError(ErrorCodes.FOOD.FOOD_NOT_FOUND);
    return food[0]
}

export const getFoods = async ({ pipeline }) => {
    return await Food.aggregate(pipeline)
}
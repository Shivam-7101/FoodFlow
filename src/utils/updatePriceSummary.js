import {
    Food,
    FoodVariant
} from '../models/index.js'

export const updatePriceSummary = async (foodId) => {

    if (!foodId) return;

    const [foodVariant] = await FoodVariant.aggregate([
        {
            $match: {
                foodId: foodId
            }
        },
        {
            $group: {
                _id: '$foodId',
                minPrice: { $min: '$price.sellingPrice' },
                maxPrice: { $max: '$price.sellingPrice' }
            }
        }
    ])
    if (!foodVariant) return;

    await Food.findByIdAndUpdate(
        foodId,
        {
            $set: {
                priceSummary: {
                    minPrice: foodVariant.minPrice,
                    maxPrice: foodVariant.maxPrice
                }
            }
        }
    )
}
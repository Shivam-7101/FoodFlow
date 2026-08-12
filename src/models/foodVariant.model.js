import mongoose from "mongoose";
import { Food } from './food.model.js'
import * as utils from '../utils/index.js'

const attributeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        value: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        _id: false
    }
);

const priceSchema = new mongoose.Schema(
    {
        originalPrice: {
            type: Number,
            required: true,
            min: 0
        },

        sellingPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        _id: false
    }
);

const foodVariantSchema = new mongoose.Schema(
    {
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        attributes: {
            type: [attributeSchema],
            default: []
        },
        expiresAt: {
            type: Date,
            expires: 0
        },

        price: {
            type: priceSchema,
            required: true
        },

        stock: {
            type: Number,
            required: true,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

foodVariantSchema.post('save', async function (doc) {

    await utils.updatePriceSummary(doc.foodId)
})

foodVariantSchema.post(['updateOne', 'findOneAndUpdate'], async function () {
    const data = this.getQuery()
    if (data._id) {
        const variant = await this.model.findById(data._id).select('foodId')
        if (variant) await utils.updatePriceSummary(variant.foodId);
    } else if (data.foodId) {
        await utils.updatePriceSummary(data.foodId);
    }
})

foodVariantSchema.post(['deleteOne', 'findOneAndDelete'], async function () {
    const data = this.getQuery()
    if (data._id) {
        const variant = await this.model.findById(data._id).select('foodId')
        if (variant) await utils.updatePriceSummary(variant.foodId);
    } else if (data.foodId) {
        await utils.updatePriceSummary(data.foodId);
    }
})

export const FoodVariant = mongoose.model("FoodVariant", foodVariantSchema);

export { attributeSchema, priceSchema };
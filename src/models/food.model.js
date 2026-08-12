import mongoose from "mongoose";
import { imageSchema } from "./imageSchema.js";
import * as constants from '../constants.js'

const priceSummary = new mongoose.Schema({
    minPrice: {
        type: Number,
        required: true,
        min: 0
    },
    maxPrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false })

const foodSchema = new mongoose.Schema(
    {
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true
        },
        isActive: {
            type: Boolean,
            default: false
        },
        expiresAt: {
            type: Date,
            expires: 0
        },
        priceSummary: priceSummary,

        category: {
            type: String,
            required: true,
            enum: constants.FOOD_CATEGORY
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000
        },

        images: {
            type: [imageSchema],
            default: []
        },

        isVeg: {
            type: Boolean,
            required: true
        },

        isAvailable: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

foodSchema.index({
    restaurantId: 1,
    category: 1
});

foodSchema.index({
    restaurantId: 1,
    isAvailable: 1
});

foodSchema.index({
    name: "text",
    description: "text"
});

export const Food = mongoose.model("Food", foodSchema);
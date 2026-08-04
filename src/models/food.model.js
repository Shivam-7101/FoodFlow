import mongoose from "mongoose";
import { imageSchema } from "./imageSchema.js";

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

        category: {
            type: String,
            required: true,
            trim: true
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
        },

        variants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "FoodVariant"
            }
        ]
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
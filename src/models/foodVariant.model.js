import mongoose from "mongoose";

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

foodVariantSchema.index({
    foodId: 1
});

export const FoodVariant = mongoose.model("FoodVariant", foodVariantSchema);

export { attributeSchema, priceSchema };
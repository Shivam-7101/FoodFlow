import mongoose from "mongoose";
import { imageSchema } from "./imageSchema.js";
import * as constants from '../constants.js'

const restaurantAddressSchema = new mongoose.Schema(
    {
        addressLine1: {
            type: String,
            required: true,
            trim: true
        },

        addressLine2: {
            type: String,
            trim: true
        },

        city: {
            type: String,
            required: true,
            trim: true
        },

        state: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            required: true,
            trim: true
        },

        postalCode: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        _id: false
    }
);

const openingHoursSchema = new mongoose.Schema(
    {
        open: {
            type: String,
            required: true
        },

        close: {
            type: String,
            required: true
        }
    },
    {
        _id: false
    }
);

const restaurantSchema = new mongoose.Schema(
    {
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
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

        logo: {
            type: imageSchema,
            required: true
        },

        banner: {
            type: imageSchema
        },

        address: {
            type: restaurantAddressSchema,
            required: true
        },

        openingHours: {
            type: openingHoursSchema,
            required: true
        },

        isOpen: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: Object.values(constants.RESTAURANT_STATUS),
            default: "PENDING",
            required: true,
            index: true
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        totalRatings: {
            type: Number,
            default: 0,
            min: 0
        },

        minimumOrderAmount: {
            type: Number,
            required: true,
            min: 0
        },

        deliveryFee: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);





restaurantSchema.index({
    "address.city": 1
});

restaurantSchema.index({
    rating: -1
});
restaurantSchema.index({userId:1,name:1},{unique:true,partialFilterExpression:{status:'ACTIVE'}})

export const Restaurant = mongoose.model("Restaurant", restaurantSchema);
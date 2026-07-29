import mongoose from "mongoose";
import { imageSchema } from "./imageSchema.js";
import * as constants from '../constants.js'

const documentSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true
        },

        image: {
            type: imageSchema,
            required: true
        }
    },
    {
        _id: false
    }
);

const locationSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },

        coordinates: {
            type: [Number],
            required: true,
            default: [0, 0]
        }
    },
    {
        _id: false
    }
);

const deliveryPartnerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        vehicleType: {
            type: String,
            enum: Object.values(constants.VEHICLE_TYPE),
            required: true
        },

        vehicleNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
        },

        isOnline: {
            type: Boolean,
            default: false
        },

        currentStatus: {
            type: String,
            enum:  Object.values(constants.DELIVERY_STATUS),
            default: "OFFLINE"
        },

        currentLocation: {
            type: locationSchema,
            required: true
        },

        earnings: {
            type: Number,
            default: 0,
            min: 0
        },

        documents: {
            type: [documentSchema],
            default: []
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        }
    },
    {
        timestamps: true
    }
);

deliveryPartnerSchema.index({
    currentLocation: "2dsphere"
});

deliveryPartnerSchema.index({
    currentStatus: 1,
    isOnline: 1
});

export const DeliveryPartner = mongoose.model(
    "DeliveryPartner",
    deliveryPartnerSchema
);
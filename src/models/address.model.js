import mongoose from "mongoose";
import { locationSchema } from './deliveryPartner.model.js'

const addressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true,
            minLength: 1,
            maxlength: 200
        },

        addressLine2: {
            type: String,
            trim: true,
            maxlength: 200
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
        },

        isDefault: {
            type: Boolean,
            default: false
        },
        expiresAt:{
            type:Date,
            expires:0
        },
        location: locationSchema
    },
    {
        timestamps: true
    }
);

addressSchema.index(
    { userId: 1, isDefault: 1 },
    {
        unique: true,
        partialFilterExpression: { isDefault: true }
    }
);

addressSchema.index({
    userId: 1,
    addressLine1: 1,
    city: 1,
    state: 1
}, { unique: true });

export const Address = mongoose.model("Address", addressSchema);
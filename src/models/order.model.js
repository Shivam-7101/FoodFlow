import mongoose from "mongoose";
import { imageSchema } from "./imageSchema.js";
import { attributeSchema } from "./foodVariant.model.js";
import * as constants from '../constants.js'

const orderItemSchema = new mongoose.Schema(
    {
        foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            required: true
        },

        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FoodVariant",
            required: true
        },

        foodName: {
            type: String,
            required: true
        },

        thumbnail: {
            type: imageSchema,
            required: true
        },

        attributes: {
            type: [attributeSchema],
            default: []
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        priceAtPurchase: {
            type: Number,
            required: true
        },

        subtotal: {
            type: Number,
            required: true
        }
    },
    {
        _id: false
    }
);

const shippingAddressSchema = new mongoose.Schema(
    {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
    },
    {
        _id: false
    }
);

const summarySchema = new mongoose.Schema(
    {
        totalItems: Number,

        subtotal: Number,

        deliveryFee: Number,

        discount: Number,

        tax: Number,

        grandTotal: Number
    },
    {
        _id: false
    }
);

const paymentSchema = new mongoose.Schema(
    {
        method: {
            type: String,
            enum: Object.values(constants.PAYMENT_METHOD),
            required: true
        },

        status: {
            type: String,
            enum: Object.values(constants.PAYMENT_STATUS),
            default: "PENDING"
        },

        provider: {
            type: String
        },

        providerOrderId: {
            type: String
        },

        providerPaymentId: {
            type: String
        },

        paidAt: Date
    },
    {
        _id: false
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
            index: true
        },

        deliveryPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryPartner"
        },

        items: {
            type: [orderItemSchema],
            required: true
        },

        summary: {
            type: summarySchema,
            required: true
        },

        payment: {
            type: paymentSchema,
            required: true
        },

        shippingAddress: {
            type: shippingAddressSchema,
            required: true
        },

        status: {
            type: String,
            enum: Object.values(constants.ORDER_STATUS),
            default: "PENDING_PAYMENT",
            index: true
        }
    },
    {
        timestamps: true
    }
);

orderSchema.index({
    userId: 1,
    createdAt: -1
});

export const Order = mongoose.model("Order", orderSchema);
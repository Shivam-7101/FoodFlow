import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true
        },

        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true
        },

        deliveryPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DeliveryPartner"
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        foodRating: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },

        restaurantRating: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },

        deliveryRating: {
            type: Number,
            min: 1,
            max: 5
        },

        comment: {
            type: String,
            trim: true,
            maxlength: 1000
        }
    },
    {
        timestamps: true
    }
);

reviewSchema.index({
    restaurantId: 1
});

export const Review = mongoose.model("Review", reviewSchema);
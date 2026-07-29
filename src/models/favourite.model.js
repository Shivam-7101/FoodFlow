import mongoose from "mongoose";

const favouriteSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        restaurantIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Restaurant"
            }
        ],

        foodIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Food"
            }
        ]
    },
    {
        timestamps: true
    }
);

export const Favourite = mongoose.model("Favourite", favouriteSchema);
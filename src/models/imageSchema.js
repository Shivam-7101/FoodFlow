import mongoose from 'mongoose'

export const imageSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);
import mongoose from 'mongoose'

export const imageSchema = new mongoose.Schema(
    {
        public_id: {
            type: String,
            required: true,
            trim: true
        },
        secure_url: {
            type: String,
            required: true,
            trim: true
        }
    },
    { _id: false }
);
import mongoose from "mongoose";
import * as constants from '../constants.js'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },

        role: {
            type: String,
            enum: Object.values(constants.USER_ROLE),
            default: "CUSTOMER",
            required: true,
            index: true
        },

        isVerified: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        optimisticConcurrency:true
    }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const User = mongoose.model("User", userSchema);
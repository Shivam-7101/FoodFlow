import { v2 as cloudinary } from 'cloudinary'
import { ErrorCodes, BadRequestError, InternalServerError } from '../errors/index.js'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export const uploadImage = (buffer, folder = 'images') => {

    if (!Buffer.isBuffer(buffer)) throw new BadRequestError(ErrorCodes.IMAGE.INVALID_BUFFER);
    console.log(`1. upload image called`)
    return new Promise((resolve, reject) => {
        console.log(`2. creating upload stream`)
        const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
            console.log(`3. callback executed`)
            if (error) {
                console.log(`CLOUDINARY ERROR: ${error}`)
                return reject(new InternalServerError(ErrorCodes.IMAGE.CLOUDINARY_UPLOAD_FAILED));
            }
            if (!result) {
                return reject(new InternalServerError(ErrorCodes.IMAGE.CLOUDINARY_UPLOAD_RESULT_FAILED))
            }

            return resolve({
                secure_url: result.secure_url,
                public_id: result.public_id
            })
        })
        console.log(`4. writing buffer`)
        stream.end(buffer)
        console.log(`5. buffer written`)
    })
}

export const deleteImage = async (public_id) => {

    if (!public_id || !public_id?.trim()) throw new BadRequestError(ErrorCodes.IMAGE.INVALID_PUBLIC_ID);

    return cloudinary.uploader.destroy(public_id)
}
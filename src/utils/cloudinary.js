import * as cloudinary from '../config/cloudinary.js'
import { ErrorCodes, BadRequestError } from '../errors/index.js'

export const uploadOne = (file, folder) => {
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestError(ErrorCodes.IMAGE.INVALID_BUFFER);

    return cloudinary.uploadImage(file.buffer, folder)
}

export const uploadMany = (files, folder) => {
    return Promise.all(files.map(file => uploadOne(file, folder)))
}

export const deleteOne = (publicId) => {
    if (!publicId?.trim()) throw new BadRequestError(ErrorCodes.IMAGE.INVALID_PUBLIC_ID);
    return cloudinary.deleteImage(publicId)
}

export const deleteMany = (arrOfPublicId) => {
    return Promise.all(arrOfPublicId.map(publicId => deleteOne(publicId)))
}
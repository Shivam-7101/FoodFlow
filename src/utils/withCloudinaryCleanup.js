import * as cloudinary from './cloudinary.js'

export const withCloudinaryCleanup = async (callback) => {

    const uploadedFiles = []

    const trackUploads = (uploadedImages) => {

        if (Array.isArray(uploadedImages)) {
            if (!uploadedImages.length) return;
            uploadedFiles.push(...uploadedImages)
            return
        }
        if (!uploadedImages) return;
        uploadedFiles.push(uploadedImages)
    }

    try {
        return await callback(trackUploads)
    } catch (error) {
        await cloudinary.deleteMany(uploadedFiles.map(file => file?.public_id))
        throw error
    }
}
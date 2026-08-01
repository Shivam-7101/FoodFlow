import multer from 'multer'
import * as constants from '../constants.js'
import { ErrorCodes, BadRequestError } from '../errors/index.js'


export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        if (!constants.ALLOWED_MIME_TYPE.includes(file.mimetype)) return cb(new BadRequestError("Invalid file type. Only JPEG, PNG, and WEBP are allowed."), false);

        return cb(null, true)
    }
})
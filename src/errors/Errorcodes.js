export const ErrorCodes = Object.freeze({
    AUTH: {
        INVALID_CREDENTIALS: "Invalid email or password.",
        USER_NOT_FOUND: "User not found.",
        EMAIL_ALREADY_EXISTS: "Email already registered.",
        PHONE_ALREADY_EXISTS: "Phone already registered.",
        INVALID_TOKEN: "Invalid token.",
        INVALID_ACCESS_TOKEN: "Invalid access token.",
        INVALID_REFRESH_TOKEN: "Invalid refresh token.",
        TOKEN_EXPIRED: "Token has expired.",
        ACCOUNT_NOT_VERIFIED: "Account is not verified.",
        ACCOUNT_ALREADY_EXISTS: "Account already exists.",
        ACCOUNT_BLOCKED: "Account had been blocked.",
        UNAUTHORIZED_ROLE: 'Not authorized to perform these actions.'
    },

    SESSION: {
        SESSION_NOT_FOUND: 'Invalid session id or, session is revoked.',
        SESSION_INVALID: 'session revoked.'
    },

    USER: {
        USER_NOT_FOUND: "User not found."
    },

    ADDRESS: {
        ADDRESS_NOT_FOUND: "Address not found."
    },

    RESTAURANT: {
        RESTAURANT_NOT_FOUND: "Restaurant not found.",
        RESTAURANT_NOT_ACTIVE: "Restaurant is not active.",
        RESTAURANT_CLOSED: "Restaurant is currently closed.",
        RESTAURANT_ALREADY_EXISTS: "Restaurant already exists."
    },

    FOOD: {
        FOOD_NOT_FOUND: "Food not found.",
        FOOD_NOT_AVAILABLE: "Food is currently unavailable.",
        VARIANT_NOT_FOUND: "Food variant not found.",
        OUT_OF_STOCK: "Requested quantity is not available."
    },

    CART: {
        CART_NOT_FOUND: "Cart not found.",
        CART_EMPTY: "Cart is empty.",
        DIFFERENT_RESTAURANT:
            "Cart can contain items from only one restaurant."
    },

    ORDER: {
        ORDER_NOT_FOUND: "Order not found.",
        INVALID_ORDER_STATUS: "Invalid order status.",
        ORDER_ALREADY_DELIVERED: "Order has already been delivered.",
        ORDER_ALREADY_CANCELLED: "Order has already been cancelled."
    },

    PAYMENT: {
        INVALID_PAYMENT_METHOD: "Invalid payment method.",
        PAYMENT_FAILED: "Payment failed.",
        PAYMENT_ALREADY_COMPLETED:
            "Payment has already been completed.",
        INVALID_WEBHOOK_SIGNATURE:
            "Invalid webhook signature."
    },

    DELIVERY: {
        DELIVERY_PARTNER_NOT_FOUND:
            "Delivery partner not found.",
        DELIVERY_PARTNER_BUSY:
            "Delivery partner is currently busy.",
        DELIVERY_PARTNER_OFFLINE:
            "Delivery partner is offline."
    },

    REVIEW: {
        REVIEW_ALREADY_EXISTS:
            "Review has already been submitted."
    },

    VALIDATION: {
        INVALID_INPUT: "Invalid input."
    },

    COMMON: {
        SOMETHING_WENT_WRONG:
            "Something went wrong."
    },

    IMAGE: {
        INVALID_MIME_TYPE: 'Invalid file type. Only JPEG, PNG, and WEBP are allowed.',
        INVALID_BUFFER: 'Invalid image buffer.',
        CLOUDINARY_UPLOAD_FAILED: 'Cloudinary image upload failed.',
        CLOUDINARY_UPLOAD_RESULT_FAILED: 'Cloudinary image upload failed to generate result.',
        INVALID_PUBLIC_ID: 'Invalid public id.',
        IMAGE_NOT_FOUND: "Upload mandatory images.",
    },
    VERIFICATION: {
        INVALID_OTP: 'Invalid or expired otp.',
        OTP_EXPIRED: 'Expired otp.',
    }
});
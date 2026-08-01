import ms from 'ms'

export const USER_ROLE = Object.freeze({
    CUSTOMER: "CUSTOMER",
    RESTAURANT_OWNER: "RESTAURANT_OWNER",
    DELIVERY_PARTNER: "DELIVERY_PARTNER",
    ADMIN: "ADMIN"
});

export const ORDER_STATUS = Object.freeze({
    PENDING_PAYMENT: "PENDING_PAYMENT",

    PLACED: "PLACED",

    RESTAURANT_ACCEPTED: "RESTAURANT_ACCEPTED",

    PREPARING: "PREPARING",

    READY_FOR_PICKUP: "READY_FOR_PICKUP",

    PICKED_UP: "PICKED_UP",

    OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",

    DELIVERED: "DELIVERED",

    CANCELLED: "CANCELLED",

    REJECTED: "REJECTED",

    REFUNDED: "REFUNDED"
});

export const PAYMENT_STATUS = Object.freeze({
    PENDING: "PENDING",

    SUCCESS: "SUCCESS",

    FAILED: "FAILED",

    REFUNDED: "REFUNDED"
});

export const PAYMENT_METHOD = Object.freeze({
    COD: "COD",

    ONLINE: "ONLINE"
});

export const PAYMENT_PROVIDER = Object.freeze({
    RAZORPAY: "RAZORPAY"
});

export const DELIVERY_STATUS = Object.freeze({
    OFFLINE: "OFFLINE",

    AVAILABLE: "AVAILABLE",

    BUSY: "BUSY"
});

export const VEHICLE_TYPE = Object.freeze({
    BIKE: "BIKE",

    SCOOTER: "SCOOTER",

    BICYCLE: "BICYCLE"
});

export const DELIVERY_PARTNER_STATUS = Object.freeze({
    PENDING: "PENDING",

    ACTIVE: "ACTIVE",

    SUSPENDED: "SUSPENDED",

    REJECTED: "REJECTED"
});
export const RESTAURANT_STATUS = Object.freeze({
    PENDING: "PENDING",

    ACTIVE: "ACTIVE",

    SUSPENDED: "SUSPENDED",

    REJECTED: "REJECTED"
});

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: ms(process.env.JWT_REFRESH_TOKEN_EXPIRY)
}

export const ALLOWED_MIME_TYPE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
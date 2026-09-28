import Razorpay from 'razorpay';
import { validatePaymentVerification as razorpayValidatePaymentVerification, validateWebhookSignature as razorpayValidateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js'

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createRazorpayOrder = async ({ amount }) => {
    const options = {
        amount: Number(Math.ceil(amount * 100)),
        currency: "INR",
        receipt: "order_rcptid_11"
    };

    try {
        const order = await instance.orders.create(options);
        // console.log('RAZORPAY ORDER: ', order);
        return order;
    } catch (error) {
        throw new Error(`RAZORPAY ERR: ${error.description || error.message}`);
    }
};

export const validatePaymentVerification = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
    return razorpayValidatePaymentVerification(
        {
            order_id: razorpayOrderId,
            payment_id: razorpayPaymentId
        },
        signature,
        process.env.RAZORPAY_KEY_SECRET
    )
}

export const validateWebhookSignature = ({ reqBody, signature }) => {
    return razorpayValidateWebhookSignature(reqBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET)
}

export const refund = async ({ paymentId, reason, amount }) => {

    try {
        const options = {
            speed: 'optimum',
            notes: {
                reason: reason || 'no reason provided.'
            }
        }

        if (amount) {
            options.amount = amount * 100
        }
        await instance.payments.refund(paymentId, options)
    } catch (error) {
        console.error('RAZORPAY REFUND ERR: ', error)
    }
}
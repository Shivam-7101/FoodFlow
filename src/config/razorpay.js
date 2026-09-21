import Razorpay from 'razorpay';

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

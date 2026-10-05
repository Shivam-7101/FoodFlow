import { Worker } from 'bullmq'
import * as utils from '../utils/index.js'
import { SOCKET_EVENTS, wsEventEmitter } from '../config/ws.js'
import { redis } from '../config/redis.js'
import { Order } from '../models/index.js'
import * as constants from '../constants.js'

export const orderLifecycleWorker = new Worker(
    'order-lifecycle-queue',
    async (job) => {
        switch (true) {
            case job.name.startsWith(`reject_order_`): {

                try {
                    const { orderId, reason } = job.data
                    let order = await Order.findByIdAndUpdate(orderId,
                        {
                            $set: {
                                status: constants.ORDER_STATUS.REJECTED
                            }
                        },
                        {
                            returnDocument: 'after'
                        }
                    )

                    if (!order) {
                        const isOrderAlreadyUpdated = await Order.findById(orderId)
                        if (!isOrderAlreadyUpdated) {
                            return;
                        }
                        if (isOrderAlreadyUpdated.status === constants.ORDER_STATUS.REJECTED) {
                            order = isOrderAlreadyUpdated;
                        } else {
                            throw new Error(`ORDER_LIFECYCLE_ERR: Order ${orderId} could not be updated to REJECTED.`);
                        }
                    }

                    if (order.payment.method === constants.PAYMENT_METHOD.ONLINE) {
                        await utils.razorpay.refund({ paymentId: order.payment.providerPaymentId, reason, amount: order.summary.grandTotal })
                    }
                } catch (error) {
                    throw error
                }
                break;
            }
            default:
                break;
        }
    },
    {
        connection: redis,
        concurrency: 5
    }
)

orderLifecycleWorker.on('error', (error) => {
    console.error(`ORDER_LIFECYCLE_WORKER_ERR: `, error)
})

// `reject_order_${orderId}`
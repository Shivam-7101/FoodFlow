import { EventEmitter } from 'events'
import * as utils from '../utils/index.js'

class PaymentEvents extends EventEmitter {

    processRefund = ({ paymentId, amount, reason }) => {
        this.emit('processRefund', { paymentId, amount, reason })
    }
}

export const paymentEvents = new PaymentEvents()

paymentEvents.on('processRefund', async ({ paymentId, amount, reason }) => {
    await utils.razorpay.refund({ paymentId, amount, reason })
})
export default class ApiResponse {
    constructor(statuscode, data, message) {
        this.success= true
        this.statuscode = statuscode || 200
        this.data = data || {}
        this.message = message
    }
}
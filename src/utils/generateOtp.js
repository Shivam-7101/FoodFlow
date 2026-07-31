export const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    return otp
}

export const getOtpHtml = (otp) => {
    return `
        <div style="font-family: Arial, sans-serif; text-align: center;">
            <h2>Your OTP</h2>
            <p>Please use the following OTP to complete your action:</p>
            <h3>${otp}</h3>
        </div>
    `
}
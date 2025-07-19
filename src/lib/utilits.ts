import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        if (!(process.env.MONGODB_URL)) {
            return 'not connected'
        }
        await mongoose.connect(process.env.MONGODB_URL)
        console.log('✅ MongoDB connected')
    } catch (err) {
        console.error('❌ MongoDB connection error:', err)
    }
}

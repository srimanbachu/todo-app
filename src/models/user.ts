import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true }
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        console.log(salt)
        this.password = await bcrypt.hash(this.password, salt);
        console.log(this.password)
        next();
    } catch (err) {
        next(err as mongoose.CallbackError);
    }
});

export const user = mongoose.model("user", userSchema)

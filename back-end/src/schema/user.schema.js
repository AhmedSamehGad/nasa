import mongoose from 'mongoose'

const UserSchema = mongoose.Schema({
    // info
    firstName:String,
    lastName:String,

    // security
    email:{type:String, unique:true},
    password:String,

    tokens:{type:[String], default:[]},

    // check email
    isVerified:{type:Boolean, default:false},
    verifyCode:String,
    verifyExpires: { type: Date, default: () => new Date(Date.now() + 10 * 60 * 1000) },

}, {timestamps:true})

UserSchema.index({verifyExpires:1}, {expireAfterSeconds:0})

const Users = mongoose.model('Users', UserSchema)
export default Users

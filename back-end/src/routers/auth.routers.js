import {Router} from 'express'
import {register, login,verifyEmail} from '../controllers/auth.controller.js'
import {loginValidator, registerValidator} from '../validators/auth.validator.js'

const authRouter = Router()

authRouter.post('/auth/register', registerValidator, register)
authRouter.post('/auth/login', loginValidator, login)
authRouter.post('/auth/verifyemail', verifyEmail)


export default authRouter
import {Router} from 'express'
import {register, verifyEmail, login} from '../controllers/auth.controller.js'
import {registerValidator, loginValidator} from '../validators/auth.validator.js'

const authRouter = Router()

authRouter.post('/auth/register', registerValidator, register)
authRouter.post('/auth/verifyemail', verifyEmail)
authRouter.post('/auth/login', loginValidator, login)




export default authRouter
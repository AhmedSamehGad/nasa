import {Router} from 'express'
import {register} from '../controllers/auth.controller.js'

const authRouter = Router()

authRouter.post('/auth/register', register)


// kjdeji

export default authRouter
import { Router } from "express";
import { getUserHistory, addUserHistory} from "../controllers/history.controllers.js";

const historyRouter = Router()

historyRouter.post('/user/:userid/history', addUserHistory)
historyRouter.get('/user/:userid/history', getUserHistory)



export default historyRouter
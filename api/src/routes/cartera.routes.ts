import { getCartera, getReportMngr, getReportMngrWsp } from '../controllers/cartera.controller';
import { Router } from 'express';

export const CarteraRouter = Router();

CarteraRouter.get('/cartera', getCartera)

CarteraRouter.post('/carteraMngr', getReportMngr)

CarteraRouter.post('/carteraMngrWsp', getReportMngrWsp)
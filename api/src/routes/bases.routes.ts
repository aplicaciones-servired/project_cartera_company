import { getAllBases, getBaseDatalle, updateBase, usersSinBase, crearBase, basesInfoUpdates, updateBaseCategoria, updateBaseExcepciones } from '../controllers/bases.controller'
import { Router } from 'express' 

export const BasesRouter = Router()

BasesRouter.get('/getAllBases', getAllBases)

BasesRouter.get('/baseDetalle/:id', getBaseDatalle)

BasesRouter.get('/usersSinBase', usersSinBase)

BasesRouter.post('/updateBase', updateBase)

BasesRouter.put('/bases/:id/categoria', updateBaseCategoria)

BasesRouter.put('/bases/:id/excepciones', updateBaseExcepciones)

BasesRouter.post('/asignar-base', crearBase)

BasesRouter.get('/updatesBases/:id', basesInfoUpdates)

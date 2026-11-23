import { Router } from 'express';
import {
  getAllCategorias,
  getCategoriaById,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '../controllers/categorias_bases.controller';

export const CategoriasBasesRouter = Router();

CategoriasBasesRouter.get('/categorias', getAllCategorias);
CategoriasBasesRouter.get('/categorias/:id', getCategoriaById);
CategoriasBasesRouter.post('/categorias', createCategoria);
CategoriasBasesRouter.put('/categorias/:id', updateCategoria);
CategoriasBasesRouter.delete('/categorias/:id', deleteCategoria);

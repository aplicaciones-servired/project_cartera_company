import { Request, Response } from 'express';
import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { z } from 'zod';
import { CategoriasBases } from '../model';

const idParamSchema = z.coerce.number().int().positive('ID de categoría inválido');

const estadoSchema = z
  .union([z.boolean(), z.number().int().min(0).max(1), z.enum(['0', '1'])])
  .transform((val) => (val === true || val === 1 || val === '1' ? 1 : 0));

const createCategoriaSchema = z.object({
  NOMBRE: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  ESTADO: estadoSchema.optional().default(1),
  USUARIO_CREACION: z
    .string()
    .trim()
    .min(1, 'El usuario de creación es obligatorio')
    .max(50, 'El usuario de creación no puede superar los 50 caracteres'),
});

const updateCategoriaSchema = z.object({
  NOMBRE: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  ESTADO: estadoSchema,
  USUARIO_MODIFICACION: z
    .string()
    .trim()
    .min(1, 'El usuario de modificación es obligatorio')
    .max(50, 'El usuario de modificación no puede superar los 50 caracteres'),
});

type SequelizeErrorLike = {
  name?: string;
  parent?: { code?: string };
  original?: { code?: string };
};

const isUniqueConstraintError = (error: unknown): boolean => {
  if (error instanceof UniqueConstraintError) return true;
  const err = error as SequelizeErrorLike | null;
  return (
    err?.name === 'SequelizeUniqueConstraintError' ||
    err?.parent?.code === 'ER_DUP_ENTRY' ||
    err?.original?.code === 'ER_DUP_ENTRY'
  );
};

const isForeignKeyConstraintError = (error: unknown): boolean => {
  if (error instanceof ForeignKeyConstraintError) return true;
  const err = error as SequelizeErrorLike | null;
  return (
    err?.name === 'SequelizeForeignKeyConstraintError' ||
    err?.parent?.code === 'ER_ROW_IS_REFERENCED_2' ||
    err?.parent?.code === 'ER_ROW_IS_REFERENCED' ||
    err?.original?.code === 'ER_ROW_IS_REFERENCED_2' ||
    err?.original?.code === 'ER_ROW_IS_REFERENCED'
  );
};

export const getAllCategorias = async (_req: Request, res: Response) => {
  try {
    const categorias = await CategoriasBases.findAll({
      order: [['ID', 'ASC']],
    });
    return res.status(200).json(categorias);
  } catch (error) {
    console.error('[CategoriasBases] Error en getAllCategorias:', error);
    return res.status(500).json({ message: 'Error al obtener las categorías' });
  }
};

export const getCategoriaById = async (req: Request, res: Response) => {
  const parsedId = idParamSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID de categoría inválido' });
  }

  try {
    const categoria = await CategoriasBases.findByPk(parsedId.data);
    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }
    return res.status(200).json(categoria);
  } catch (error) {
    console.error('[CategoriasBases] Error en getCategoriaById:', error);
    return res.status(500).json({ message: 'Error al consultar la categoría' });
  }
};

export const createCategoria = async (req: Request, res: Response) => {
  const parsed = createCategoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Datos inválidos',
    });
  }

  const { NOMBRE, ESTADO, USUARIO_CREACION } = parsed.data;

  try {
    const categoria = await CategoriasBases.create({
      NOMBRE,
      ESTADO,
      USUARIO_CREACION,
      USUARIO_MODIFICACION: null,
      FECHA_MODIFICACION: null,
    });
    return res.status(201).json(categoria);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    console.error('[CategoriasBases] Error en createCategoria:', error);
    return res.status(500).json({ message: 'Error al crear la categoría' });
  }
};

export const updateCategoria = async (req: Request, res: Response) => {
  const parsedId = idParamSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID de categoría inválido' });
  }

  const parsed = updateCategoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Datos inválidos',
    });
  }

  const { NOMBRE, ESTADO, USUARIO_MODIFICACION } = parsed.data;

  try {
    const categoria = await CategoriasBases.findByPk(parsedId.data);
    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await categoria.update({
      NOMBRE,
      ESTADO,
      USUARIO_MODIFICACION,
      FECHA_MODIFICACION: new Date(),
    });

    return res.status(200).json(categoria);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    }
    console.error('[CategoriasBases] Error en updateCategoria:', error);
    return res.status(500).json({ message: 'Error al actualizar la categoría' });
  }
};

export const deleteCategoria = async (req: Request, res: Response) => {
  const parsedId = idParamSchema.safeParse(req.params.id);
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID de categoría inválido' });
  }

  try {
    const categoria = await CategoriasBases.findByPk(parsedId.data);
    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await categoria.destroy();
    return res.status(200).json({
      message: 'Categoría eliminada correctamente',
      id: parsedId.data,
    });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return res.status(409).json({
        message: 'No se puede eliminar la categoría porque está asociada a otros registros. Puede desactivarla en su lugar.',
      });
    }
    console.error('[CategoriasBases] Error en deleteCategoria:', error);
    return res.status(500).json({ message: 'Error al eliminar la categoría' });
  }
};

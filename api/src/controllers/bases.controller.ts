import { Aud_Bases } from '../model/aud_bases.model'
import { Sellers } from '../model/sellers.model';
import { Cartera } from '../model/cartera.model';
import { Bases } from '../model/bases.model';
import { CategoriasBases } from '../model/categorias_bases.model';
import { Request, Response } from 'express';
import { fn } from 'sequelize';
import { z } from 'zod';

const updateBaseCategoriaSchema = z.object({
  CATEGORIA: z.coerce.number().int().min(0, 'Categoría inválida')
});

const updateBaseExcepcionesSchema = z
  .object({
    EXCP2: z.coerce.number().int().min(0, 'El valor de Domingueros debe ser mayor o igual a 0').optional(),
    EXCP3: z.coerce.number().int().min(0, 'El valor de Quincenazos debe ser mayor o igual a 0').optional()
  })
  .refine((data) => data.EXCP2 !== undefined || data.EXCP3 !== undefined, {
    message: 'Debe enviar al menos Domingueros (EXCP2) o Quincenazos (EXCP3)'
  });

export const getAllBases = async (req: Request, res: Response) => {
  try {
    const result = await Bases.findAll({
      include: {
        attributes: ['NOMBRES'],
        model: Sellers,
        required: true,
      }
    })
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json(error)
  }
}

export const getBaseDatalle = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await Bases.findOne({
      where: {
        VINCULADO: id
      },
      include: {
        attributes: ['NOMBRES'],
        model: Sellers,
        required: true,
      },

    })
    return res.status(200).json(result)
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
  }
}

export const updateBase = async (req: Request, res: Response) => {
  const { BASE, RASPE, OBS, VINCULADO, BASE_ACT, RASPE_ACT, LOGIN } = req.body

  if (BASE === null && RASPE === null) {
    return res.status(400).json({ msg: 'Mínimo se debe actualizar una base' })
  }

  if (OBS === '') {
    return res.status(400).json({ msg: 'La observación no puede estar vacía' })
  }

  if (BASE === BASE_ACT || RASPE === RASPE_ACT) {
    return res.status(400).json({ msg: 'No se puede actualizar con el mismo valor actual' })
  }

  try {
    const result = await Bases.update({
      BASE: BASE === null ? BASE_ACT : BASE,
      RASPE: RASPE === null ? RASPE_ACT : RASPE,
      OBSERVACION: OBS,
      LOGIN: LOGIN
    }, {
      where: {
        VINCULADO
      }
    })

    if (result[0] === 0) {
      return res.status(400).json({ msg: 'No se pudo actualizar la base' })
    }

    await Aud_Bases.create({
      VINCULADO: VINCULADO,
      BASE_ANT: BASE_ACT === null ? BASE : BASE_ACT,
      BASE_NEW: BASE === null ? BASE_ACT : BASE,
      RASPE_ANT: RASPE_ACT === null ? RASPE : RASPE_ACT,
      RASPE_NEW: RASPE === null ? RASPE_ACT : RASPE,
      LOGIN: LOGIN,
      OBSERVACION: OBS,
      VERSION: '1'
    })

    return res.status(200).json('Base actualizada correctamente')
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
  }

}

export const basesInfoUpdates = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await Aud_Bases.findAll({
      where: {
        VINCULADO: id
      },
      limit: 20,
    })

    const reverseResult = result.reverse()

    return res.status(200).json(reverseResult)
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
  }
}

export const usersSinBase = async (req: Request, res: Response) => {
  try {
    const resulst = await Cartera.findAll({
      attributes: ['EMPRESA', 'CUENTA', 'VINCULADO'],
      where: { FECHA: fn('CURDATE') },
      include: [
        {
          attributes: ['NOMBRES'],
          model: Sellers,
          required: true,
        },
        {
          attributes: ['BASE', 'RASPE'],
          model: Bases,
          required: false,
        }
      ],
    })

    const userSinBase = resulst.filter((item: any) => item.Basis === null);
    return res.status(200).json(userSinBase)
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
  }
}

export const crearBase = async (req: Request, res: Response) => {
  const { base, raspa, vinculado, login } = req.body

  try {
    const result = await Bases.create({
      BASE: base,
      RASPE: raspa,
      VINCULADO: vinculado,
      EXCP2: 0,
      EXCP3: 0,
      CATEGORIA: 0,
      LOGIN: login,
      OBSERVACION: 'Primera Asignación',
      VERSION: '0'
    })

    if (result === null) {
      return res.status(400).json('No se pudo crear la base')
    }

    return res.status(201).json('Base creada correctamente')
  } catch (error) {
    console.log(error);
    return res.status(500).json(error)
  }
}

export const updateBaseCategoria = async (req: Request, res: Response) => {
  const vinculado = String(req.params.id ?? '').trim();
  if (!vinculado) {
    return res.status(400).json({ message: 'Vinculado inválido' });
  }

  const parsed = updateBaseCategoriaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Categoría inválida'
    });
  }

  const { CATEGORIA } = parsed.data;

  try {
    if (CATEGORIA > 0) {
      const categoria = await CategoriasBases.findByPk(CATEGORIA);
      if (!categoria) {
        return res.status(404).json({ message: 'La categoría seleccionada no existe' });
      }
    }

    const base = await Bases.findByPk(vinculado);
    if (!base) {
      return res.status(404).json({ message: 'Base no encontrada para el vinculado' });
    }

    await base.update({ CATEGORIA });

    return res.status(200).json({
      message: 'Categoría actualizada correctamente',
      VINCULADO: vinculado,
      CATEGORIA
    });
  } catch (error) {
    console.error('[Bases] Error en updateBaseCategoria:', error);
    return res.status(500).json({ message: 'Error al actualizar la categoría de la base' });
  }
}

export const updateBaseExcepciones = async (req: Request, res: Response) => {
  const vinculado = String(req.params.id ?? '').trim();
  if (!vinculado) {
    return res.status(400).json({ message: 'Vinculado inválido' });
  }

  const parsed = updateBaseExcepcionesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message || 'Valores inválidos'
    });
  }

  try {
    const base = await Bases.findByPk(vinculado);
    if (!base) {
      return res.status(404).json({ message: 'Base no encontrada para el vinculado' });
    }

    const updates: { EXCP2?: number; EXCP3?: number } = {};
    if (parsed.data.EXCP2 !== undefined) updates.EXCP2 = parsed.data.EXCP2;
    if (parsed.data.EXCP3 !== undefined) updates.EXCP3 = parsed.data.EXCP3;

    await base.update(updates);

    return res.status(200).json({
      message: 'Valores actualizados correctamente',
      VINCULADO: vinculado,
      EXCP2: base.EXCP2,
      EXCP3: base.EXCP3
    });
  } catch (error) {
    console.error('[Bases] Error en updateBaseExcepciones:', error);
    return res.status(500).json({ message: 'Error al actualizar Domingueros / Quincenazos' });
  }
}
import { Bases, Cartera, CategoriasBases, Recaudo, Sellers } from '../model'
import { col, fn, Op, where } from 'sequelize';
import { buildRecaudoKey } from '../utils/funtions';

const carAttr: (keyof Cartera)[] = ['EMPRESA', 'VINCULADO', 'SALDO_ANT', 'DEBITO', 'CREDITO', 'NUEVOSALDO', 'RECHAZADOS', 'ACEPTADOS', 'DIGITADOS', 'VTABNET', 'VTASIISS', 'VTASFLEX', 'VTA_S1', 'PENDIENTES_CONT']
const sellAttr: (keyof Sellers)[] = ['DOCUMENTO', 'NOMBRES', 'NOMBRECARGO', 'CCOSTO']
const baseAttr: (keyof Bases)[] = ['BASE', 'RASPE', 'CATEGORIA', 'EXCP2', 'EXCP3']

function absfilter(abs: boolean) {
  if (abs === false) {
    return [where(fn('ABS', col('SALDO_ANT')), '<>', 0)]
  } else {
    return [where(fn('ABS', col('SALDO_ANT')), { [Op.gt]: 100 })]
  }
}

function empFilter(empresa: string) {
  if (empresa === '101') {
    return { [Op.eq]: '101' }
  } else if (empresa === '102') {
    return { [Op.eq]: '102' }
  } else {
    return {
      [Op.in]: ['101', '102']
    }
  }
}

export async function CarteraDataServices(empresa: string, abs: boolean) {
  return await Cartera.findAll({
    attributes: carAttr,
    where: {
      FECHA: fn('CURDATE'),
      EMPRESA: empFilter(empresa),
      [Op.and]: absfilter(abs),
    },
    include: [
      { attributes: sellAttr, model: Sellers, required: false, },
      { attributes: baseAttr, model: Bases, required: false, }
    ]
  });
}

/**
 * Obtiene el valor del último recaudo del día por (EMPRESA, VINCULADO)
 * usando los mismos filtros del reporte Estados Transportes Recaudos.
 */
export async function RecaudoValoresHoyService(empresa: string): Promise<Map<string, number>> {
  const recaudos = await Recaudo.findAll({
    attributes: ['EMPRESA', 'VINCULADO', 'VALOR', 'HORA_CONTEO', 'HORAMOVI', 'ID_RECAUDO'],
    where: {
      FECHA: fn('CURDATE'),
      EMPRESA: empFilter(empresa),
      ESTADO: { [Op.in]: ['u', 'r'] },
      NOTA_CONTEO: { [Op.ne]: '' }
    },
    order: [['HORA_CONTEO', 'ASC'], ['HORAMOVI', 'ASC'], ['ID_RECAUDO', 'ASC']],
    raw: true
  });

  const valorPorVinculado = new Map<string, number>();
  for (const item of recaudos) {
    const key = buildRecaudoKey(item.EMPRESA, item.VINCULADO);
    const valor = Number(item.VALOR ?? 0);
    valorPorVinculado.set(key, Number.isFinite(valor) ? valor : 0);
  }

  return valorPorVinculado;
}

/**
 * Obtiene un mapa de ID -> NOMBRE desde CATEGORIAS_BASES.
 */
export async function CategoriasMapService(): Promise<Map<number, string>> {
  const categorias = await CategoriasBases.findAll({
    attributes: ['ID', 'NOMBRE'],
    raw: true
  });

  const categoriaPorId = new Map<number, string>();
  for (const cat of categorias) {
    const id = Number(cat.ID);
    if (Number.isFinite(id) && cat.NOMBRE) {
      categoriaPorId.set(id, cat.NOMBRE);
    }
  }

  return categoriaPorId;
}

import { CarteraDataServices } from '../services/cartera.services'
import { mapCarteraResults } from '../utils/funtions';
import { getMngrPool } from '../connections/mngr'
import { executeWithTimeout, getConnectionSafe } from '../utils/oracleHelper';
import { Request, Response } from 'express'
import { Bases, Cartera, Sellers } from '../model';
import { Ifocontacto } from '../model/infocontacto'
import { sendWhatsAppText } from '../services/whatsapp.service'
import { z } from 'zod';
import { Connection } from 'oracledb';

const schema = z.object({
  fecha1: z.string(),
  fecha2: z.string(),
  vinculado: z.string().transform((val) => parseInt(val, 10)),
})

const CODIGOS_SERVIRED = '1113, 1002, 1072, 1071, 2072, 2026'
const CODIGO_MULTIRED = '1213, 1252, 1204, 2202, 2226'
const VALID_CCOSTOS = ['39629', '39630', '39631', '39632']
const CCOSTO_LABELS: Record<string, string> = {
  '39629': 'Yumbo',
  '39630': 'Vijes',
  '39631': 'La Cumbre',
  '39632': 'Jamundí',
}

type RowType = [
  string,  // fecha
  string,  // cuenta
  string,  // empresa
  string,  // vinculado
  number,  // ingresos
  number,  // egresos
  number,  // abonos_cartera
  number   // version
];

type SellerPortfolioSummary = {
  vinculado: number
  documento: string | null
  sellerName: string | null
  cargo: string | null
  empresa: string | null
  saldoInicial: number
  base: number
  ingresos: number
  egresos: number
  abonos: number
  saldoFinal: number
  cartera: Record<string | number, any>[]
  phone: string | null
  hasContact: boolean
  isValidForDispatch: boolean
  validationReason: string | null
  ccosto: string | null
}

const normalizePhone = (value?: string | null): string | null => {
  if (!value) return null

  const digits = String(value).replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('57') && digits.length > 2) {
    return digits.slice(2)
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return digits.slice(1)
  }

  if (digits.length === 10) {
    return digits
  }

  if (digits.length === 11 && digits.startsWith('3')) {
    return digits.slice(1)
  }

  return digits
}

const findContactPhone = async (documento?: string | number | null): Promise<string | null> => {
  if (!documento) {
    return null
  }

  const normalizedDocumento = String(documento).trim()
  if (!normalizedDocumento) {
    return null
  }

  const contact = await Ifocontacto.findOne({
    where: { DOCUMENTO: normalizedDocumento }
  })

  return normalizePhone(contact?.CELULAR || contact?.TELEFONO || undefined)
}

const buildBulkMessage = (summary: BulkSummary): string => {
  const saldoInicial = Number(summary.saldoInicial ?? summary.cartera ?? 0)
  const base = Number(summary.base ?? 0)
  const ingresos = Number(summary.ingresos ?? 0)
  const egresos = Number(summary.egresos ?? 0)
  const abonos = Number(summary.abonos ?? 0)
  // const saldoFinal = Number(summary.saldoFinal ?? (saldoInicial - base - ingresos + egresos - abonos) ?? 0)

  return [
    'Cartera Manager',
    summary.sellerName ? `Asesora: ${summary.sellerName}` : 'Asesora: N/D',
    `Vinculado: ${summary.vinculado}`,
    `Cartera: ${saldoInicial.toLocaleString('es-CO')}`,
    // `Base asignada: ${base.toLocaleString('es-CO')}`,
    // `Ingresos: ${ingresos.toLocaleString('es-CO')}`,
    // `Egresos: ${egresos.toLocaleString('es-CO')}`,
    // `Abonos cartera: ${abonos.toLocaleString('es-CO')}`,
    // `Saldo final cartera: ${saldoFinal.toLocaleString('es-CO')}`
  ].join('\n')
}

const getDispatchValidation = ({
  documento,
  ccosto,
  phone,
}: {
  documento?: string | null
  ccosto?: string | null
  phone?: string | null
}): { isValidForDispatch: boolean; validationReason: string | null } => {
  if (!documento) {
    return { isValidForDispatch: false, validationReason: 'Sin documento de vendedor' }
  }

  if (!ccosto || !VALID_CCOSTOS.includes(ccosto)) {
    return {
      isValidForDispatch: false,
      validationReason: `Centro de costo no permitido (${ccosto || 'N/D'})`,
    }
  }

  if (!phone) {
    return { isValidForDispatch: false, validationReason: 'Sin contacto válido en INFOCONTACTO' }
  }

  return { isValidForDispatch: true, validationReason: null }
}

const buildPortfolioSummary = async ({
  vinculado,
  fecha1,
  fecha2,
  connection,
  requestId,
  frmDate1,
  frmDate2,
}: {
  vinculado: number
  fecha1: string
  fecha2: string
  connection: Connection
  requestId: string
  frmDate1: string
  frmDate2: string
}): Promise<SellerPortfolioSummary> => {
  // Validar que vinculado sea un número positivo válido
  if (!Number.isInteger(vinculado) || vinculado <= 0) {
    throw new Error(`Vinculado inválido: ${vinculado}. Debe ser un número positivo.`);
  }

  const CarteraInicial = await Cartera.findOne({
    attributes: ['SALDO_ANT'],
    where: {
      VINCULADO: vinculado,
      FECHA: fecha1
    },
    include: [{
      model: Sellers,
      attributes: ['DOCUMENTO', 'NOMBRES', 'CCOSTO', 'NOMBRECARGO'],
    }]
  })

  const SellerPowerBi = CarteraInicial?.Seller
  const base = await Bases.findOne({ attributes: ['BASE'], where: { VINCULADO: vinculado } })
  const SQL_CODES = SellerPowerBi?.CCOSTO === '39632' ? CODIGOS_SERVIRED : CODIGO_MULTIRED
  const phone = await findContactPhone(SellerPowerBi?.DOCUMENTO || vinculado)
  const validation = getDispatchValidation({
    documento: SellerPowerBi?.DOCUMENTO || null,
    ccosto: SellerPowerBi?.CCOSTO || null,
    phone,
  })

  const { result } = await executeWithTimeout<RowType[][]>(
    connection,
    `SELECT
      mcnfecha fecha, mcncuenta cuenta, mcnEmpresa empresa, mcnVincula vinculado,
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvaldebi else 0 end) INGRESOS,
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvalcred else 0 end) EGRESOS,
      SUM (case when (mn.mcntipodoc in (${SQL_CODES})) then mcnvalcred else 0 end) ABONOS_CARTERA,
      0 VERSION
      FROM manager.mngmcn mn
      WHERE mcncuenta = '13459501'
      AND mcnfecha between TO_DATE(:fecha1, 'DD-MM-YYYY') and TO_DATE(:fecha2, 'DD-MM-YYYY')
      AND (mcntpreg = 0 or mcntpreg = 1 or mcntpreg = 2 or mcntpreg > 6)
      AND mcnVincula = TO_CHAR(:documento)
      GROUP BY mcnfecha, mcncuenta, mcnEmpresa, mcnVincula
      ORDER BY mcnfecha`,
    { fecha1: frmDate1, fecha2: frmDate2, documento: vinculado },
    { timeout: 60000, requestId }
  )

  const { rows, metaData } = result
  const oracleData: Record<string | number, any>[] = (rows?.map(row => {
    return metaData?.reduce((acc, meta, index) => {
      acc[meta.name.toLowerCase()] = row[index]
      return acc
    }, {} as Record<string | number, any>)
  }) || []).filter((item): item is Record<string | number, any> => Boolean(item))

  const ingresos = oracleData.reduce((acc, item) => acc + Number(item.ingresos || 0), 0)
  const egresos = oracleData.reduce((acc, item) => acc + Number(item.egresos || 0), 0)
  const abonos = oracleData.reduce((acc, item) => acc + Number(item.abonos_cartera || 0), 0)
  const saldoInicial = Number(CarteraInicial?.SALDO_ANT || 0)
  const saldoFinal = ingresos + saldoInicial - egresos - abonos - Number(base?.BASE || 0)

  return {
    vinculado,
    documento: SellerPowerBi?.DOCUMENTO || null,
    sellerName: SellerPowerBi?.NOMBRES || null,
    cargo: SellerPowerBi?.NOMBRECARGO || null,
    empresa: SellerPowerBi?.CCOSTO ? CCOSTO_LABELS[SellerPowerBi.CCOSTO] || 'No permitido' : null,
    saldoInicial,
    base: Number(base?.BASE || 0),
    ingresos,
    egresos,
    abonos,
    saldoFinal,
    cartera: oracleData,
    phone,
    hasContact: validation.isValidForDispatch,
    isValidForDispatch: validation.isValidForDispatch,
    validationReason: validation.validationReason,
    ccosto: SellerPowerBi?.CCOSTO || null,
  }
}

export const getCartera = async (req: Request, res: Response) => {
  const { empresa, abs } = req.query;

  if (!empresa || !abs) {
    res.status(400).json({ message: 'Missing parameters' });
    return
  }

  const absBool = abs === 'true' ? true : false;

  try {
    const results = await CarteraDataServices(empresa as string, absBool);
    const mapeado = mapCarteraResults(results);
    res.status(200).json(mapeado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error });
  }
}

export const getReportMngr = async (req: Request, res: Response) => {
  const { success, data, error } = schema.safeParse(req.body);

  if (!success) {
    res.status(400).json({ message: error.format() });
    return
  }

  if (!data) {
    res.status(400).json({ message: 'Missing parameters' });
    return
  }

  const fecha1Raw = data.fecha1.split(' ')[0].trim();
  const fecha2Raw = data.fecha2.split(' ')[0].trim();
  const vinculado = data.vinculado;

  if (!fecha1Raw.match(/^\d{4}-\d{2}-\d{2}$/) || !fecha2Raw.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' })
  }

  const frmDate1 = fecha1Raw.split('-').reverse().join('-');
  const frmDate2 = fecha2Raw.split('-').reverse().join('-');

  let connection: Connection | undefined;
  let connectionClosedByTimeout = false;
  let requestId = '';

  try {
    const CarteraInicial = await Cartera.findOne({
      attributes: ['SALDO_ANT'],
      where: {
        VINCULADO: vinculado,
        FECHA: fecha1Raw
      },
      include: [{
        model: Sellers,
        attributes: ['DOCUMENTO', 'NOMBRES', 'CCOSTO', 'NOMBRECARGO'],
      }]
    });

    const SellerPowerBi = CarteraInicial?.Seller

    if (!SellerPowerBi) {
      res.status(404).json({ message: 'El documento ingresado no se encuentra en BD POWER BI' });
      return
    }

    const base = await Bases.findOne({ attributes: ['BASE'], where: { VINCULADO: vinculado } })
    const SQL_CODES = SellerPowerBi.CCOSTO === '39632' ? CODIGOS_SERVIRED : CODIGO_MULTIRED;

    const connResult = await getConnectionSafe(getMngrPool, 'oracleMngr');
    connection = connResult.connection;
    requestId = connResult.requestId;

    console.log(`[${requestId}] Ejecutando getReportMngr para vinculado ${vinculado}`);

    const { result, connectionClosed } = await executeWithTimeout<RowType[][]>(
      connection,
      `SELECT
      mcnfecha fecha, mcncuenta cuenta, mcnEmpresa empresa, mcnVincula vinculado,
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvaldebi else 0 end) INGRESOS,
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvalcred else 0 end) EGRESOS,
      SUM (case when (mn.mcntipodoc in (${SQL_CODES})) then mcnvalcred else 0 end) ABONOS_CARTERA,
      0 VERSION
      FROM manager.mngmcn mn
      WHERE mcncuenta = '13459501'
      And mcnfecha between TO_DATE(:fecha1, 'DD-MM-YYYY') and TO_DATE(:fecha2, 'DD-MM-YYYY')
      AND (mcntpreg = 0 or mcntpreg = 1 or mcntpreg = 2 or mcntpreg > 6)
      AND mcnVincula = TO_CHAR(:documento)
      GROUP BY mcnfecha, mcncuenta, mcnEmpresa, mcnVincula
      ORDER BY mcnfecha`,
      { fecha1: frmDate1, fecha2: frmDate2, documento: vinculado },
      { timeout: 60000, requestId }
    );

    connectionClosedByTimeout = connectionClosed;
    const { rows, metaData } = result;

    const oracleData = rows?.map(row => {
      return metaData?.reduce((acc, meta, index) => {
        acc[meta.name.toLowerCase()] = row[index];
        return acc;
      }, {} as Record<string | number, any>);
    });

    console.log(`[${requestId}] getReportMngr completado exitosamente`);
    res.status(200).json({ cartera: oracleData, CarteraInicial, Seller: SellerPowerBi, base: base?.BASE || 0 });
  } catch (error) {
    const enhancedError = error as Error & { connectionClosed?: boolean };
    if (enhancedError.connectionClosed) {
      connectionClosedByTimeout = true;
    }
    console.error(`[${requestId}] Error en getReportMngr:`, error);
    res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
  } finally {
    if (connection && !connectionClosedByTimeout) {
      try {
        await connection.close();
        console.log(`[${requestId}] Conexión cerrada normalmente`);
      } catch (closeError) {
        console.error(`[${requestId}] Error closing connection:`, closeError);
      }
    }
  }
}

const schemaWsp = z.object({
  vinculado: z.string().optional(),
  selectedVinculados: z.array(z.coerce.number().int().positive()).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  mode: z.enum(['report', 'dispatch', 'upsert-contact']).optional().default('report')
})

export const getReportMngrWsp = async (req: Request, res: Response) => {
  const parsed = schemaWsp.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.format() });
  }

  const { mode } = parsed.data

  if (mode === 'upsert-contact') {
    const documento = typeof req.body?.documento === 'string' ? req.body.documento.trim() : ''
    const telefono = typeof req.body?.telefono === 'string' ? req.body.telefono.trim() : ''

    if (!documento || !telefono) {
      return res.status(400).json({ message: 'Documento y teléfono son obligatorios' })
    }

    try {
      const normalizedPhone = normalizePhone(telefono)
      if (!normalizedPhone) {
        return res.status(400).json({ message: 'Teléfono inválido' })
      }

      const [contact, created] = await Ifocontacto.upsert({
        DOCUMENTO: documento,
        CELULAR: normalizedPhone,
        TELEFONO: normalizedPhone,
        EMAIL: null,
        DOCALTERNO: null,
        NOMBREALTERNO: null,
        CELALTERNO: null,
        FECHACREATE: new Date(),
        FECHAUPDATE: new Date(),
        LOGINUPD: 'WSP',
        VERSION: '1'
      } as any, { returning: true })

      return res.status(200).json({ success: true, created, phone: normalizedPhone, contact })
    } catch (error) {
      console.error('Error upserting contact', error)
      return res.status(500).json({ message: 'No fue posible guardar el teléfono' })
    }
  }

  const { vinculado, selectedVinculados, limit = 20 } = parsed.data

  // Traer carteras positivas del día actual
  let summaries: BulkSummary[] = []
  
  try {
    // Traer carteras positivas de ambas empresas
    const carterasServired = await CarteraDataServices('Servired', true)
    const carterasMultired = await CarteraDataServices('Multired', true)
    const allCarteras = [...carterasServired, ...carterasMultired]

    if (allCarteras.length === 0) {
      return res.status(200).json({ cartera: [], CarteraInicial: null, Seller: null, base: 0, bulk: true })
    }

    // Procesar cada cartera
    for (const cartera of allCarteras) {
      // Ensure we have seller info (some carteras may not include seller in the join)
      let seller = cartera.Seller || null
      if (!seller || !seller.DOCUMENTO) {
        try {
          const found = await Sellers.findOne({ where: { DOCUMENTO: String(cartera.VINCULADO) } })
          if (found) seller = found
        } catch (err) {
          // ignore lookup errors, validation will handle missing fields
        }
      }

      const phone = await findContactPhone(seller?.DOCUMENTO || cartera.VINCULADO)
      const validation = getDispatchValidation({
        documento: seller?.DOCUMENTO || null,
        ccosto: seller?.CCOSTO || null,
        phone,
      })

      summaries.push({
        vinculado: Number(cartera.VINCULADO),
        empresa: cartera.EMPRESA,
        nombres: cartera.Seller?.NOMBRES || '',
        documento: seller?.DOCUMENTO || cartera.Seller?.DOCUMENTO || '',
        cargo: cartera.Seller?.NOMBRECARGO || '',
        cartera: cartera.SALDO_ANT || 0,
        saldoInicial: cartera.SALDO_ANT || 0,
        sellerName: seller?.NOMBRES || cartera.Seller?.NOMBRES || '',
        phone: phone || '',
        hasContact: Boolean(phone),
        isValidForDispatch: validation.isValidForDispatch,
        validationReason: validation.validationReason,
        ccosto: seller?.CCOSTO || cartera.Seller?.CCOSTO || '',
        base: cartera.BASE || 0,
        base_id: undefined
      })
    }

    // Eliminar duplicados por vinculado para evitar doble envío si aparece en varias empresas
    const uniqueSummariesByVinculado = summaries.reduce<Record<number, BulkSummary>>((acc, summary) => {
      const existing = acc[summary.vinculado]
      if (!existing) {
        acc[summary.vinculado] = summary
        return acc
      }

      const shouldReplace = !existing.isValidForDispatch && summary.isValidForDispatch
      if (shouldReplace) {
        acc[summary.vinculado] = summary
      }
      return acc
    }, {})

    summaries = Object.values(uniqueSummariesByVinculado)

    // Si se busca un documento específico
    if (vinculado) {
      const vinculadoInt = parseInt(vinculado, 10)
      const specific = summaries.find(s => s.vinculado === vinculadoInt)
      if (specific) {
        return res.status(200).json({
          cartera: [specific],
          CarteraInicial: { SALDO_ANT: specific.saldoInicial },
          Seller: { NOMBRES: specific.sellerName, DOCUMENTO: specific.documento, CCOSTO: specific.ccosto, NOMBRECARGO: specific.cargo },
          base: specific.base,
          bulk: false,
          phone: specific.phone,
          hasContact: specific.hasContact
        })
      }
    }

    // Si se seleccionan vinculados específicos en modo dispatch, enviar WhatsApp
    if (mode === 'dispatch') {
      console.log(`Dispatch mode requested. selectedVinculados=${JSON.stringify(selectedVinculados)}`)
      if (!selectedVinculados || selectedVinculados.length === 0) {
        return res.status(400).json({ message: 'Debe seleccionar al menos una cartera para enviar' })
      }

      const filtered = summaries.filter(s => selectedVinculados.includes(s.vinculado))
      let sentCount = 0
      let skippedCount = 0
      const dispatched: BulkSummary[] = []
      const failures: Array<{ vinculado: number; phone: string; message: string }> = []

      for (const summary of filtered) {
        console.log(`Dispatch candidate ${summary.vinculado}: phone=${summary.phone}, valid=${summary.isValidForDispatch}, reason=${summary.validationReason}`)
        if (!summary.isValidForDispatch || !summary.phone) {
          skippedCount += 1
          failures.push({
            vinculado: summary.vinculado,
            phone: summary.phone || 'N/D',
            message: summary.validationReason || 'No válido para envío',
          })
          continue
        }

        try {
          await sendWhatsAppText(summary.phone, buildBulkMessage(summary))
          sentCount += 1
          dispatched.push(summary)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`Error enviando WhatsApp a ${summary.phone}:`, errorMessage)
          skippedCount += 1
          failures.push({
            vinculado: summary.vinculado,
            phone: summary.phone,
            message: errorMessage,
          })
        }
      }

      return res.status(200).json({ cartera: filtered, bulk: true, sentCount, skippedCount, dispatched, failures })
    }

    // Si se seleccionan vinculados específicos solo para consulta
    if (selectedVinculados && selectedVinculados.length > 0) {
      const filtered = summaries.filter(s => selectedVinculados.includes(s.vinculado))
      return res.status(200).json({ cartera: filtered, bulk: true })
    }

    // Devolver límite de carteras
    const limited = summaries.slice(0, limit)
    return res.status(200).json({ cartera: limited, bulk: true })
  } catch (error) {
    console.error('Error en getReportMngrWsp:', error)
    return res.status(500).json({ message: 'Error al procesar carteras', error: (error as Error).message })
  }
}

export const getDetalladoWsp = async (req: Request, res: Response) => {
  const { empresa, abs } = req.query;

  if (!empresa || !abs) {
    res.status(400).json({ message: 'Missing parameters' });
    return
  }

  try {
    const results = await CarteraDataServices(empresa as string, abs === 'true');

    const mapped = await Promise.all(results.map(async (item: any) => {
      const vendedor = item.Seller || {};
      const documento = vendedor.DOCUMENTO || null;
      const ccosto = vendedor.CCOSTO || null;

      const contact = await Ifocontacto.findOne({ where: { DOCUMENTO: documento || String(item.VINCULADO) } });
      const phone = normalizePhone(contact?.CELULAR || contact?.TELEFONO || undefined);

      const validation = getDispatchValidation({ documento, ccosto, phone });

      return {
        vinculado: Number(item.VINCULADO) || 0,
        documento: documento || String(item.VINCULADO),
        sellerName: vendedor.NOMBRES || null,
        cargo: vendedor.NOMBRECARGO || null,
        empresa: vendedor.CCOSTO || null,
        saldoInicial: Number(item.SALDO_ANT || 0),
        base: Number(item.Basis?.BASE || 0),
        ingresos: Number(item.DEBITO || 0),
        egresos: Number(item.CREDITO || 0),
        abonos: 0,
        saldoFinal: Number(item.NUEVOSALDO || 0),
        cartera: [],
        phone,
        hasContact: validation.isValidForDispatch,
        isValidForDispatch: validation.isValidForDispatch,
        validationReason: validation.validationReason,
        ccosto: ccosto || null
      }
    }))

    res.status(200).json({ cartera: mapped, totalCarteras: mapped.length })
  } catch (error) {
    console.error('Error in getDetalladoWsp', error)
    res.status(500).json({ message: 'Internal server error', error })
  }
}

interface BulkSummary {
  vinculado: number
  empresa: string
  nombres: string
  documento: string
  ccosto: string
  cargo: string
  cartera: number
  saldoInicial: number
  ingresos?: number
  egresos?: number
  abonos?: number
  saldoFinal?: number
  sellerName: string
  phone: string
  hasContact: boolean
  isValidForDispatch: boolean
  validationReason: string | null
  base: number
  base_id?: number
}

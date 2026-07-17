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

const buildBulkMessage = (summary: SellerPortfolioSummary): string => {
  return [
    'Cartera Manager',
    summary.sellerName ? `Asesora: ${summary.sellerName}` : 'Asesora: N/D',
    `Vinculado: ${summary.vinculado}`,
    `Saldo inicial: ${summary.saldoInicial.toLocaleString('es-CO')}`,
    `Base asignada: ${summary.base.toLocaleString('es-CO')}`,
    `Ingresos: ${summary.ingresos.toLocaleString('es-CO')}`,
    `Egresos: ${summary.egresos.toLocaleString('es-CO')}`,
    `Abonos cartera: ${summary.abonos.toLocaleString('es-CO')}`,
    `Saldo final cartera: ${summary.saldoFinal.toLocaleString('es-CO')}`
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
  fecha1: z.string().optional(),
  fecha2: z.string().optional(),
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

  const { fecha1, fecha2, vinculado, selectedVinculados, limit = 20 } = parsed.data

  if (!fecha1 || !fecha2) {
    return res.status(400).json({ message: 'Fechas obligatorias' })
  }
  
  // Validar y limpiar fechas
  const trimmedFecha1 = fecha1.trim();
  const trimmedFecha2 = fecha2.trim();
  
  if (!trimmedFecha1.match(/^\d{4}-\d{2}-\d{2}$/) || !trimmedFecha2.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' })
  }
  
  const frmDate1 = trimmedFecha1.split('-').reverse().join('-');
  const frmDate2 = trimmedFecha2.split('-').reverse().join('-');

  let connection: Connection | undefined;
  let connectionClosedByTimeout = false;
  let requestId = '';

  try {
    const connResult = await getConnectionSafe(getMngrPool, 'oracleMngr');
    connection = connResult.connection;
    requestId = connResult.requestId;

    const vinculadoAsInt = vinculado ? parseInt(vinculado, 10) : undefined;

    if (vinculadoAsInt) {
      const summary = await buildPortfolioSummary({
        vinculado: vinculadoAsInt,
        fecha1,
        fecha2,
        connection,
        requestId,
        frmDate1,
        frmDate2,
      })

      return res.status(200).json({
        cartera: summary.cartera,
        CarteraInicial: { SALDO_ANT: summary.saldoInicial },
        Seller: {
          NOMBRES: summary.sellerName,
          CCOSTO: summary.ccosto,
          NOMBRECARGO: summary.cargo,
          DOCUMENTO: summary.documento,
        },
        base: summary.base,
        bulk: false,
        phone: summary.phone,
        hasContact: summary.hasContact,
      })
    }

    console.log(`[${requestId}] Ejecutando consulta masiva de cartera para fechas ${fecha1}-${fecha2}`);

    const { result } = await executeWithTimeout<RowType[][]>(
      connection,
      `SELECT DISTINCT mcnVincula vinculado
      FROM manager.mngmcn mn
      WHERE mcncuenta = '13459501'
      AND mcnfecha between TO_DATE(:fecha1, 'DD-MM-YYYY') and TO_DATE(:fecha2, 'DD-MM-YYYY')
      AND (mcntpreg = 0 or mcntpreg = 1 or mcntpreg = 2 or mcntpreg > 6)
      ORDER BY mcnVincula`,
      { fecha1: frmDate1, fecha2: frmDate2 },
      { timeout: 60000, requestId }
    )

    const vinculados = (result.rows || [])
      .map((row: unknown[]) => Number(row[0]))
      .filter((v) => v > 0) // Solo valores positivos válidos
    const requestedVinculados = (selectedVinculados && selectedVinculados.length > 0)
      ? selectedVinculados.filter((v) => v > 0)
      : vinculados.slice(0, limit)
    const summaries: SellerPortfolioSummary[] = []

    for (const currentVinculado of requestedVinculados) {
      const summary = await buildPortfolioSummary({
        vinculado: currentVinculado,
        fecha1,
        fecha2,
        connection,
        requestId,
        frmDate1,
        frmDate2,
      })

      summaries.push(summary)
    }

    const eligibleSummaries = summaries.filter((summary) => summary.isValidForDispatch)

    if (mode === 'dispatch') {
      const dispatched: Array<Record<string, unknown>> = []
      let sentCount = 0
      let skippedCount = 0

      for (const summary of eligibleSummaries) {
        if (!summary.phone) {
          skippedCount += 1
          dispatched.push({ vinculado: summary.vinculado, sent: false, reason: 'Sin teléfono' })
          continue
        }

        try {
          await sendWhatsAppText(summary.phone, buildBulkMessage(summary))
          sentCount += 1
          dispatched.push({ vinculado: summary.vinculado, sent: true, phone: summary.phone })
        } catch (error) {
          skippedCount += 1
          dispatched.push({ vinculado: summary.vinculado, sent: false, reason: 'No se pudo enviar' })
        }
      }

      return res.status(200).json({
        bulk: true,
        mode: 'dispatch',
        cartera: eligibleSummaries,
        totalCarteras: vinculados.length,
        limit,
        selectedVinculados: requestedVinculados,
        sentCount,
        skippedCount,
        dispatched,
      })
    }

    return res.status(200).json({
      bulk: true,
      mode: 'report',
      cartera: summaries,
      totalCarteras: vinculados.length,
      limit,
      selectedVinculados: requestedVinculados,
    })
  } catch (error) {
    const enhancedError = error as Error & { connectionClosed?: boolean };
    if (enhancedError.connectionClosed) {
      connectionClosedByTimeout = true;
    }
    console.error(`[${requestId}] Error en getReportMngrWsp:`, error);
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

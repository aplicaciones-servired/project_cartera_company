import { Request, Response } from 'express'
import { LogGestionCartera } from '../model'

type LogPayload = Partial<{
  EMPRESA: string | null
  CEDULA: string | null
  NOMBRES: string | null
  CARGO: string | null
  ZONA: string | null
  BASE: string | null
  SALDO_ANT: number | null
  DEBITO: number | null
  CREDITO: number | null
  SALDO: number | null
  CARTERA: number | null
  RECHAZADOS: number | null
  ACEPTADOS: number | null
  PENDIENTE_CONTEO: number | null
  VENTA_BNET: number | null
  CUADRE_WEB: number | null
  ANULADOS: number | null
  WHATSAPP: string | null
  MENSAJE_ENVIADO: string | null
  FECHA_HORA_ENVIO: Date | null
  ESTADO_ENVIO: 'PENDIENTE' | 'ENVIADO' | 'RECIBIDO' | 'ERROR' | null
  API_MENSAJE_ID: string | null
  FECHA_RECEPCION: Date | null
  ERROR_ENVIO: string | null
  NUMERO_INTENTOS: number | null
  USUARIO_ENVIO: string | null
}>

// Función reutilizable para crear un registro en la tabla
export const createLogRecord = async (payload: LogPayload) => {
  try {
    const record = await LogGestionCartera.create({
      EMPRESA: payload.EMPRESA ?? null,
      CEDULA: payload.CEDULA ?? null,
      NOMBRES: payload.NOMBRES ?? null,
      CARGO: payload.CARGO ?? null,
      ZONA: payload.ZONA ?? null,
      BASE: payload.BASE ?? null,
      SALDO_ANT: payload.SALDO_ANT ?? 0,
      DEBITO: payload.DEBITO ?? 0,
      CREDITO: payload.CREDITO ?? 0,
      SALDO: payload.SALDO ?? 0,
      CARTERA: payload.CARTERA ?? 0,
      RECHAZADOS: payload.RECHAZADOS ?? 0,
      ACEPTADOS: payload.ACEPTADOS ?? 0,
      PENDIENTE_CONTEO: payload.PENDIENTE_CONTEO ?? 0,
      VENTA_BNET: payload.VENTA_BNET ?? 0,
      CUADRE_WEB: payload.CUADRE_WEB ?? 0,
      ANULADOS: payload.ANULADOS ?? 0,
      WHATSAPP: payload.WHATSAPP ?? null,
      MENSAJE_ENVIADO: payload.MENSAJE_ENVIADO ?? null,
      FECHA_HORA_ENVIO: payload.FECHA_HORA_ENVIO ?? new Date(),
      ESTADO_ENVIO: payload.ESTADO_ENVIO ?? 'PENDIENTE',
      API_MENSAJE_ID: payload.API_MENSAJE_ID ?? null,
      FECHA_RECEPCION: payload.FECHA_RECEPCION ?? null,
      ERROR_ENVIO: payload.ERROR_ENVIO ?? null,
      NUMERO_INTENTOS: payload.NUMERO_INTENTOS ?? 1,
      USUARIO_ENVIO: payload.USUARIO_ENVIO ?? 'BOT_CARTERA'
    })

    return record
  } catch (error) {
    console.error('[LogGestionCartera] Error creating record', (error as Error).message)
    throw error
  }
}

// Actualiza el estado por API_MENSAJE_ID
export const markLogAsReceived = async (apiMessageId?: string, fechaRecepcion?: Date) => {
  if (!apiMessageId) return null

  try {
    const [count] = await LogGestionCartera.update({
      ESTADO_ENVIO: 'RECIBIDO',
      FECHA_RECEPCION: fechaRecepcion ?? new Date()
    }, {
      where: { API_MENSAJE_ID: apiMessageId }
    })

    return { updated: count }
  } catch (error) {
    console.error('[LogGestionCartera] Error updating record', (error as Error).message)
    throw error
  }
}

// Marca un registro como ENVIADO usando su ID y guarda el apiMessageId
export const markLogAsSentById = async (logId?: number, apiMessageId?: string) => {
  if (!logId) return null

  try {
    const [count] = await LogGestionCartera.update({
      ESTADO_ENVIO: 'ENVIADO',
      API_MENSAJE_ID: apiMessageId ?? null,
      FECHA_HORA_ENVIO: new Date()
    }, {
      where: { ID: logId }
    })

    return { updated: count }
  } catch (error) {
    console.error('[LogGestionCartera] Error updating sent by id', (error as Error).message)
    throw error
  }
}


// Express handlers (opcionales)
export const createLogHandler = async (req: Request, res: Response) => {
  try {
    const payload = req.body
    const record = await createLogRecord(payload)
    res.status(201).json(record)
  } catch (error) {
    res.status(500).json({ message: 'Error creando log' })
  }
}

export const markReceivedHandler = async (req: Request, res: Response) => {
  const { apiMessageId } = req.params
  try {
    const result = await markLogAsReceived(apiMessageId)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando log' })
  }
}

export default {
  createLogRecord,
  markLogAsReceived,
}

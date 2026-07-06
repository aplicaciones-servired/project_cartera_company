import axios from 'axios'
import { API_URL } from '../utils/contanst'
import { formatValue } from '../utils/funtions'
import { CarteraI, MngrReport, Seller } from '../types/cartera'

type WhatsAppSendPayload = {
  phone: string
  message: string
}

const getAxiosErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.response?.data?.message || error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export const sendWhatsAppMessage = async (payload: WhatsAppSendPayload): Promise<void> => {
  try {
    await axios.post(`${API_URL}/whatsapp/send`, payload)
  } catch (error) {
    throw new Error(getAxiosErrorMessage(error, 'No fue posible enviar el mensaje'))
  }
}

export const getWhatsAppStatus = async (): Promise<{
  status: 'idle' | 'starting' | 'qr' | 'authenticated' | 'ready' | 'error'
  qr: string
  error: string
}> => {
  const response = await axios.get(`${API_URL}/whatsapp/status`)
  return response.data
}

export const resetWhatsAppSession = async (): Promise<{ message: string }> => {
  try {
    const response = await axios.post(`${API_URL}/whatsapp/reset`)
    return response.data
  } catch (error) {
    throw new Error(getAxiosErrorMessage(error, 'No fue posible reiniciar la sesión de WhatsApp'))
  }
}

export const buildCarteraMessage = (datos: CarteraI[]): string => {
  const lines = datos.slice(0, 15).map((item) => {
    return `${item.Empresa} | ${item.Vinculado} | ${item.Nombres} | ${formatValue(item.Cartera)}`
  })

  return [
    'Reporte Cartera',
    `Registros: ${datos.length}`,
    '',
    ...lines,
    datos.length > 15 ? `... y ${datos.length - 15} registros más` : ''
  ].filter(Boolean).join('\n')
}

export const buildManagerMessage = (
  datos: MngrReport[],
  initial: number,
  base: number,
  info: Seller | undefined
): string => {
  const totalIngresos = datos.reduce((acc, item) => acc + item.ingresos, 0)
  const totalEgresos = datos.reduce((acc, item) => acc + item.egresos, 0)
  const totalAbonos = datos.reduce((acc, item) => acc + item.abonos_cartera, 0)
  const saldoFinal = totalIngresos + initial - totalEgresos - totalAbonos - base

  const lines = datos.slice(0, 15).map((item) => {
    const fecha = item.fecha.split('T')[0]
    return `${fecha} | ${formatValue(item.ingresos)} | ${formatValue(item.egresos)} | ${formatValue(item.abonos_cartera)}`
  })

  return [
    'Reporte Manager',
    info ? `Vendedor: ${info.NOMBRES} - ${info.DOCUMENTO}` : '',
    `Saldo inicial: ${formatValue(initial)}`,
    `Base asignada: ${formatValue(base)}`,
    `Cartera: ${formatValue(saldoFinal)}`,
    `Ingresos: ${formatValue(totalIngresos)}`,
    `Egresos: ${formatValue(totalEgresos)}`,
    `Abonos cartera: ${formatValue(totalAbonos)}`,
    '',
    ...lines,
    datos.length > 15 ? `... y ${datos.length - 15} registros más` : ''
  ].filter(Boolean).join('\n')
}

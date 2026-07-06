import { Request, Response } from 'express'
import { z } from 'zod'
import { getWhatsAppStatus, resetWhatsAppSession, sendWhatsAppText } from '../services/whatsapp.service'

const sendSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
})

export const getWhatsAppHealth = async (_req: Request, res: Response) => {
  try {
    const status = await getWhatsAppStatus()
    res.status(200).json(status)
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible consultar el estado de WhatsApp',
      error: (error as Error).message,
    })
  }
}

export const sendWhatsAppMessage = async (req: Request, res: Response) => {
  const result = sendSchema.safeParse(req.body)

  if (!result.success) {
    res.status(400).json({ message: result.error.format() })
    return
  }

  try {
    await sendWhatsAppText(result.data.phone, result.data.message)
    res.status(200).json({ message: 'Mensaje enviado correctamente' })
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible enviar el mensaje',
      error: (error as Error).message,
    })
  }
}

export const resetWhatsApp = async (_req: Request, res: Response) => {
  try {
    const result = await resetWhatsAppSession()
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible reiniciar la sesión de WhatsApp',
      error: (error as Error).message,
    })
  }
}
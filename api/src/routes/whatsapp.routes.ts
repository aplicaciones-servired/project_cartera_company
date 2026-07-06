import { Router } from 'express'
import { getWhatsAppHealth, resetWhatsApp, sendWhatsAppMessage } from '../controllers/whatsapp.controller'

export const whatsappRouter = Router()

whatsappRouter.get('/whatsapp/status', getWhatsAppHealth)
whatsappRouter.post('/whatsapp/send', sendWhatsAppMessage)
whatsappRouter.post('/whatsapp/reset', resetWhatsApp)
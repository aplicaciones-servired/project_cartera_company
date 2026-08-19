import { createLogRecord, markLogAsSentById } from '../controllers/log_gestion_cartera.controller'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v26.0'

const getPhoneNumbersId = (): string => {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!id) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID no está configurado en .env')
  }
  return id
}

const getToken = (): string => {
  const token = process.env.TOKEN_WHATSAPP
  if (!token) {
    throw new Error('TOKEN_WHATSAPP no está configurado en .env')
  }
  return token
}

export type WhatsAppState = 'ready' | 'error'

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('57') && digits.length === 12) {
    return digits
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `57${digits.slice(1)}`
  }

  if (digits.length === 10) {
    return `57${digits}`
  }

  if (digits.length === 11 && digits.startsWith('3')) {
    return `57${digits.slice(1)}`
  }

  if (digits.length === 12 && digits.startsWith('57')) {
    return digits
  }

  return digits
}

export const getWhatsAppStatus = async (): Promise<{
  status: WhatsAppState
  qr: string
  error: string
}> => {
  try {
    getToken()
    getPhoneNumbersId()
    return { status: 'ready', qr: '', error: '' }
  } catch (err) {
    return { status: 'error', qr: '', error: (err as Error).message }
  }
}

export const sendWhatsAppText = async (phone: string, message: string, opts?: { preLogId?: number }): Promise<void> => {
  const token = getToken()
  const phoneNumberId = getPhoneNumbersId()
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    throw new Error('El teléfono es obligatorio')
  }

  const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizedPhone,
    type: 'text',
    text: { body: message },
  }

  console.log(`[WhatsApp] POST ${url}`)
  console.log(`[WhatsApp] Payload: ${JSON.stringify(payload)}`)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (fetchErr) {
    const detail = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    console.error(`[WhatsApp] Error de red en fetch: ${detail}`)
    throw new Error(`Error de red al conectar con WhatsApp API: ${detail}`)
  }

  const data = await response.json()

  if (!response.ok) {
    const errorMsg = data?.error?.message || JSON.stringify(data)
    console.error(`[WhatsApp] API respondió ${response.status}: ${errorMsg}`)
    throw new Error(`WhatsApp API error (${response.status}): ${errorMsg}`)
  }

  const apiId = data?.messages?.[0]?.id || null
  console.log(`[WhatsApp] Mensaje enviado a ${normalizedPhone}, API_ID: ${apiId}`)

  try {
    if (opts && opts.preLogId) {
      await markLogAsSentById(opts.preLogId, apiId)
      console.log('[WhatsApp] Log pre-creado actualizado con API_ID', apiId)
    } else {
      await createLogRecord({
        WHATSAPP: normalizedPhone,
        MENSAJE_ENVIADO: message,
        FECHA_HORA_ENVIO: new Date(),
        ESTADO_ENVIO: 'ENVIADO',
        API_MENSAJE_ID: apiId,
        NUMERO_INTENTOS: 1,
        USUARIO_ENVIO: 'BOT_CARTERA',
      })
      console.log('[WhatsApp] Registro ENVIADO creado en LOG_GESTION_CARTERA', apiId)
    }
  } catch (err) {
    console.warn('[WhatsApp] No fue posible registrar ENVIADO en LOG_GESTION_CARTERA:', (err as Error).message)
  }
}

export const resetWhatsAppSession = async (): Promise<{ message: string }> => {
  return { message: 'Con API oficial no hay sesión local que reiniciar' }
}

import path from 'path'
import { rm } from 'fs/promises'

type WhatsAppModule = {
  Client: new (options: any) => any
  LocalAuth: new (options: any) => any
}

const loadWhatsAppModule = (): WhatsAppModule => {
  const candidatePaths = [
    path.resolve(process.cwd(), '..', 'client', 'node_modules', 'whatsapp-web.js'),
    'whatsapp-web.js',
  ]

  for (const modulePath of candidatePaths) {
    try {
      return require(modulePath) as WhatsAppModule
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('No se pudo cargar whatsapp-web.js')
}

const { Client, LocalAuth } = loadWhatsAppModule()

type WhatsAppState = 'idle' | 'starting' | 'qr' | 'authenticated' | 'ready' | 'error'

let client: any = null
let startPromise: Promise<any> | null = null
let readyPromise: Promise<void> | null = null
let readyResolve: (() => void) | null = null
let readyReject: ((error: Error) => void) | null = null
let currentState: WhatsAppState = 'idle'
let lastQrCode = ''
let lastError = ''
const authPath = path.resolve(process.cwd(), '.wwebjs_auth')

const createReadyPromise = (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve, reject) => {
      readyResolve = resolve
      readyReject = reject
    })
    // Evitar unhandled rejection: marcamos el promise como manejado
    // (seguirá rechazándose para quien lo `await`, pero Node no matará el proceso)
    readyPromise.catch(() => {})
  }

  return readyPromise
}

const resolveReady = (): void => {
  if (readyResolve) {
    readyResolve()
    readyResolve = null
    readyReject = null
    readyPromise = null
  }
}

const rejectReady = (message: string): void => {
  if (readyReject) {
    readyReject(new Error(message))
    readyResolve = null
    readyReject = null
    readyPromise = null
  }
}

const createClient = (): any => {
  return new Client({
    authStrategy: new LocalAuth({
      clientId: 'cartera-company',
      dataPath: authPath,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  })
}

const destroyClient = async (): Promise<void> => {
  if (client) {
    try {
      await client.destroy()
    } catch {
      // Ignore shutdown errors while resetting the session.
    }
  }

  client = null
  startPromise = null
  readyPromise = null
  readyResolve = null
  readyReject = null
  currentState = 'idle'
  lastQrCode = ''
  lastError = ''
}

const ensureStarted = async (): Promise<any> => {
  if (client) {
    return client
  }

  if (!startPromise) {
    currentState = 'starting'
    client = createClient()
    createReadyPromise()

    client.on('qr', (qr: string) => {
      lastQrCode = qr
      currentState = 'qr'
    })

    client.on('authenticated', () => {
      currentState = 'authenticated'
      lastError = ''
      console.log('[WhatsApp] Cliente autenticado, esperando estado ready')
    })

    client.on('ready', () => {
      currentState = 'ready'
      lastQrCode = ''
      lastError = ''
      resolveReady()
      console.log('[WhatsApp] Cliente listo')
    })

    client.on('auth_failure', (message: string) => {
      currentState = 'error'
      lastError = message
      rejectReady(message)
      console.error('[WhatsApp] Falló la autenticación:', message)
    })

    client.on('disconnected', (reason: string) => {
      currentState = 'error'
      lastError = reason
      console.warn('[WhatsApp] Cliente desconectado:', reason)
      // Rechazamos la promesa de ready para desbloquear esperas, si existe
      rejectReady(reason)

      // Si se desconectó por LOGOUT, eliminamos la sesión y reiniciamos el cliente
      if (reason === 'LOGOUT') {
        destroyClient()
          .then(() => rm(authPath, { recursive: true, force: true }))
          .catch(() => undefined)
          .then(() => {
            // Intentamos reiniciar el cliente en background sin bloquear
            ensureStarted().catch(() => undefined)
          })
      }
    })

    startPromise = client.initialize().then(() => client).catch((err: any) => {
      currentState = 'error'
      lastError = (err && err.message) ? err.message : String(err)
      console.error('[WhatsApp] Error iniciando cliente:', lastError)
      // Rechazamos la promesa de ready si existe (evita bloqueo de llamadas que esperan)
      rejectReady(lastError)
      return Promise.reject(err)
    })
  }

  return startPromise
}

const waitForWhatsAppReady = async (): Promise<void> => {
  if (currentState === 'ready') {
    return
  }

  if (currentState === 'error') {
    throw new Error(lastError || 'WhatsApp no pudo iniciar')
  }

  if (currentState === 'authenticated') {
    await createReadyPromise()
    return
  }

  await createReadyPromise()
}

const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

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

export const getWhatsAppStatus = async (): Promise<{
  status: WhatsAppState
  qr: string
  error: string
}> => {
  await ensureStarted()

  return {
    status: currentState,
    qr: lastQrCode,
    error: lastError,
  }
}

export const sendWhatsAppText = async (phone: string, message: string): Promise<void> => {
  const whatsappClient = await ensureStarted()
  await waitForWhatsAppReady()
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    throw new Error('El teléfono es obligatorio')
  }

  const numberId = await whatsappClient.getNumberId(normalizedPhone)
  if (!numberId) {
    throw new Error(`El número ${normalizedPhone} no está registrado en WhatsApp`)
  }

  const chatId = typeof numberId === 'string'
    ? numberId
    : (numberId as any)._serialized || `${normalizedPhone}@c.us`

  console.log(`[WhatsApp] Enviando a ${chatId}`)

  if (!whatsappClient || typeof whatsappClient.sendMessage !== 'function') {
    throw new Error('Cliente de WhatsApp no está disponible')
  }

  await whatsappClient.sendMessage(chatId, message)
  console.log(`[WhatsApp] Mensaje enviado a ${chatId}`)
}

export const resetWhatsAppSession = async (): Promise<{ message: string }> => {
  await destroyClient()

  try {
    await rm(authPath, { recursive: true, force: true })
  } catch (error) {
    console.warn('[WhatsApp] No se pudo borrar la sesión anterior:', (error as Error).message)
  }

  await ensureStarted()

  return { message: 'Sesión de WhatsApp reiniciada' }
}
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
      rejectReady(reason)
      console.warn('[WhatsApp] Cliente desconectado:', reason)
    })

    startPromise = client.initialize().then(() => client)
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

  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`
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

  await whatsappClient.sendMessage(`${normalizedPhone}@c.us`, message)
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
import { RiWhatsappFill, RiFileChartFill } from '@remixicon/react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getWhatsAppStatus } from '../services/whatsapp'

const cards = [
  {
    title: 'Cartera',
    description: 'Abre el reporte de cartera y usa la opción Enviar por WhatsApp desde el botón de exportación.',
    icon: RiFileChartFill,
    route: '/reportMngrWsp',
    button: 'Abrir cartera',
    gradient: 'from-green-900 to-green-700'
  }
]

export default function ReportesWhatsApp () {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'ready' | 'error'>('ready')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadStatus = async (): Promise<void> => {
    try {
      setLoading(true)
      const result = await getWhatsAppStatus()
      setStatus(result.status)
      setError(result.error)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No fue posible consultar WhatsApp')
      toast.error('No fue posible consultar el estado de WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  if (loading) {
    return (
      <section className='p-4'>
        <article className='rounded-2xl bg-slate-900 p-6 shadow-xl border border-slate-700 text-white'>
          Validando estado de WhatsApp...
        </article>
      </section>
    )
  }

  if (status !== 'ready') {
    return (
      <section className='p-4 space-y-4'>
        <article className='rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl border border-slate-700'>
          <div className='flex items-center gap-4'>
            <RiWhatsappFill size={52} color='white' />
            <div>
              <h1 className='text-2xl font-semibold text-white'>WhatsApp no está listo</h1>
              <p className='text-slate-200'>
                Verifica que las variables TOKEN_WHATSAPP y WHATSAPP_PHONE_NUMBER_ID estén configuradas en el archivo .env del backend.
              </p>
            </div>
          </div>
        </article>

        <article className='rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-md'>
          <p className='font-semibold'>Estado actual: {status}</p>
          {error ? <p className='mt-2'>Detalle: {error}</p> : null}
        </article>

        <div className='flex gap-2'>
          <button
            onClick={loadStatus}
            className='rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600'
          >
            Volver a validar
          </button>
          <button
            onClick={() => navigate('/')}
            className='rounded-md bg-gray-200 px-4 py-2 font-semibold text-gray-900 hover:bg-gray-300'
          >
            Ir al inicio
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className='p-4 space-y-4'>
      <article className='rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl border border-slate-700'>
        <div className='flex items-center gap-4'>
          <RiWhatsappFill size={52} color='white' />
          <div>
            <h1 className='text-2xl font-semibold text-white'>Reportes por WhatsApp</h1>
            <p className='text-slate-200'>
              API oficial de WhatsApp Business configurada. Desde aquí puedes entrar a los reportes que incluyen la acción para enviar el resumen por WhatsApp.
            </p>
          </div>
        </div>
      </article>

      <section className='grid gap-4 xl:grid-cols-3'>
        {cards.map(({ title, description, icon: Icon, route, button, gradient }) => (
          <article key={title} className={`flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r ${gradient} p-5 shadow-xl` }>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='text-xl font-semibold text-white'>{title}</h2>
                <p className='mt-2 text-sm text-white/90'>{description}</p>
              </div>
              <Icon size={42} color='white' />
            </div>

            <div className='flex justify-end'>
              <button
                onClick={() => navigate(`${route}?source=whatsapp`, { state: { fromWhatsAppMenu: true } })}
                className='rounded-md bg-yellow-300 px-4 py-2 font-semibold text-gray-900 hover:bg-yellow-400'
              >
                {button}
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  )
}

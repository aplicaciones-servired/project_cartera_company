import { RiWhatsappFill, RiFileChartFill } from '@remixicon/react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getWhatsAppStatus, resetWhatsAppSession } from '../services/whatsapp'

const cards = [
  {
    title: 'Cartera',
    description: 'Abre el reporte de cartera y usa la opción Enviar por WhatsApp desde el botón de exportación.',
    icon: RiFileChartFill,
    route: '/reportMngrWsp',
    button: 'Abrir cartera',
    gradient: 'from-green-900 to-green-700'
  }
  // {
  //   title: 'Cartera V2',
  //   description: 'Versión alternativa del reporte de cartera con la misma opción de envío por WhatsApp.',
  //   icon: RiBarChartGroupedLine,
  //   route: '/ReportMngrV2',
  //   button: 'Abrir cartera V2',
  //   gradient: 'from-emerald-900 to-emerald-700'
  // },
  // {
  //   title: 'Recaudos',
  //   description: 'Consulta recaudos y comparte el resultado por WhatsApp desde el reporte.',
  //   icon: RiCaravanLine,
  //   route: '/ReportRecaudos',
  //   button: 'Abrir recaudos',
  //   gradient: 'from-red-900 to-red-700'
  // }
]

export default function ReportesWhatsApp () {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'starting' | 'qr' | 'authenticated' | 'ready' | 'error'>('idle')
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const qrImageUrl = qr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qr)}`
    : ''

  const loadStatus = async (): Promise<void> => {
    try {
      setLoading(true)
      const result = await getWhatsAppStatus()
      setStatus(result.status)
      setQr(result.qr)
      setError(result.error)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'No fue posible consultar WhatsApp')
      toast.error('No fue posible consultar el estado de WhatsApp')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSession = async (): Promise<void> => {
    try {
      setResetting(true)
      await resetWhatsAppSession()
      toast.success('Sesión reiniciada. Se generó un nuevo QR.')
      await loadStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No fue posible reiniciar la sesión')
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    if (status === 'ready') {
      return
    }

    const interval = window.setInterval(() => {
      loadStatus()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [status])

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
                Antes de abrir los reportes, debes vincular WhatsApp Web una sola vez en el backend.
              </p>
            </div>
          </div>
        </article>

        <article className='rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-md'>
          <p className='font-semibold'>Estado actual: {status}</p>
          {status === 'authenticated'
            ? (
            <p className='mt-2 text-amber-800'>
              El QR ya fue aceptado. Espera unos segundos a que WhatsApp termine de conectar.
            </p>
              )
            : null}
          {error ? <p className='mt-2'>Detalle: {error}</p> : null}
          {qr
            ? (
            <div className='mt-4 flex flex-col items-start gap-3'>
              <img
                src={qrImageUrl}
                alt='Código QR de WhatsApp'
                className='h-64 w-64 rounded-xl border border-amber-300 bg-white p-2 shadow-sm'
              />
              <p className='break-all text-xs text-amber-800'>
                Si la imagen no carga, usa este valor temporal: {qr}
              </p>
            </div>
              )
            : null}
          <p className='mt-3'>
            Abre el endpoint de estado en el backend, escanea el QR desde WhatsApp y luego ve a Dispositivos vinculados, y vuelve aquí.
          </p>
        </article>

        <div className='flex gap-2'>
          <button
            onClick={loadStatus}
            className='rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-600'
          >
            Volver a validar
          </button>
          <button
            onClick={handleResetSession}
            disabled={resetting}
            className='rounded-md bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {resetting ? 'Reiniciando...' : 'Reiniciar sesión WhatsApp'}
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
              Desde aquí puedes entrar a los reportes que ya incluyen la acción para enviar el resumen por WhatsApp.
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

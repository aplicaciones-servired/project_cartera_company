import { useEffect, useState } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from './ui'

type WhatsAppPhoneDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (phone: string) => Promise<void>
  title: string
  description: string
}

export default function WhatsAppPhoneDialog ({
  open,
  onOpenChange,
  onSend,
  title,
  description,
}: WhatsAppPhoneDialogProps): JSX.Element {
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setPhone('')
      setSending(false)
    }
  }, [open])

  const handleSend = async (): Promise<void> => {
    if (!phone.trim()) {
      return
    }

    try {
      setSending(true)
      await onSend(phone.trim())
      onOpenChange(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-2xl'>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='text-2xl text-white'>{title}</DialogTitle>
          <DialogDescription className='text-slate-300'>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className='mt-6 space-y-2'>
          <label className='text-sm font-medium text-slate-200'>Número de WhatsApp</label>
          <Input
            autoFocus
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder='Ej: 3001234567 o +57 3001234567'
            className='border-slate-700 bg-slate-950/60 text-white placeholder:text-slate-400'
          />
          <p className='text-xs text-slate-400'>
            Ingresa el número con o sin indicativo. El sistema intentará normalizarlo automáticamente.
          </p>
        </div>

        <DialogFooter className='mt-6 gap-3'>
          <Button variant='secondary' onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || phone.trim().length === 0}>
            {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
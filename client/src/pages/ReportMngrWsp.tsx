import { Badge, Button, Card, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Table, TableBody, TableFoot, TableHead, TableHeaderCell, TableRoot, TableRow } from '../components/ui'
import { formatValue } from '../utils/funtions'
import { FormEvent, useMemo, useState } from 'react'
import { API_URL } from '../utils/contanst'
import axios from 'axios'
import { toast } from 'sonner'
import { TableCell } from '../components/ui/TableTremor'

type BulkSummary = {
  vinculado: number
  documento?: string | null
  sellerName?: string | null
  cargo?: string | null
  empresa?: string | null
  saldoInicial?: number
  base?: number
  ingresos?: number
  egresos?: number
  abonos?: number
  saldoFinal?: number
  cartera?: Array<Record<string, unknown>>
  phone?: string | null
  hasContact?: boolean
  isValidForDispatch?: boolean
  validationReason?: string | null
  ccosto?: string | null
}

type ReportResponse = {
  bulk?: boolean
  mode?: string
  cartera: Array<Record<string, unknown>>
  CarteraInicial?: { SALDO_ANT?: number } | null
  Seller?: { NOMBRES?: string; CCOSTO?: string; NOMBRECARGO?: string; DOCUMENTO?: string } | null
  base?: number | null
  totalCarteras?: number
  limit?: number
  sentCount?: number
  skippedCount?: number
  dispatched?: Array<Record<string, unknown>>
  phone?: string | null
  hasContact?: boolean
}

export default function ReportMngrWsp () {
  const [data, setData] = useState<ReportResponse | null>(null)
  const [documento, setDocumento] = useState<string>('')
  const [fecha1, setFecha1] = useState<string>('')
  const [fecha2, setFecha2] = useState<string>('')
  const [limit, setLimit] = useState<string>('20')
  const [loading, setLoading] = useState<boolean>(false)
  const [dispatching, setDispatching] = useState<boolean>(false)
  const [selectedVinculados, setSelectedVinculados] = useState<number[]>([])
  const [companyFilter, setCompanyFilter] = useState<'all' | 'servired' | 'multired'>('all')
  const [quickDocument, setQuickDocument] = useState<string>('')
  const [contactDialogOpen, setContactDialogOpen] = useState<boolean>(false)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState<boolean>(false)
  const [contactFormDocumento, setContactFormDocumento] = useState<string>('')
  const [contactFormCelular, setContactFormCelular] = useState<string>('')
  const [contactFormTelefono, setContactFormTelefono] = useState<string>('')
  const [contactFormEmail, setContactFormEmail] = useState<string>('')
  const [contactFormDocAlterno, setContactFormDocAlterno] = useState<string>('')
  const [contactFormNombreAlterno, setContactFormNombreAlterno] = useState<string>('')
  const [contactFormCelAlterno, setContactFormCelAlterno] = useState<string>('')
  const [phoneUpdateDocumento, setPhoneUpdateDocumento] = useState<string>('')
  const [phoneUpdatePhone, setPhoneUpdatePhone] = useState<string>('')
  const [savingPhone, setSavingPhone] = useState<boolean>(false)

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault()

    if (!fecha1 || !fecha2) {
      toast.error('Debe seleccionar las fechas inicial y final')
      return
    }

    if (documento && !documento.match(/^[0-9]+$/)) {
      toast.error('El documento debe tener solo números', { description: 'Verificar documento' })
      return
    }

    setLoading(true)

    try {
      const searchVinculado = documento ? Number(documento) : undefined
      const nextSelectedVinculados = documento && searchVinculado
        ? Array.from(new Set([...selectedVinculados, searchVinculado]))
        : selectedVinculados

      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        fecha1,
        fecha2,
        limit: Number(limit || 20),
        mode: 'report',
        ...(searchVinculado ? { selectedVinculados: nextSelectedVinculados } : {})
      }, { timeout: 180000 })

      setData(response.data)
      if (searchVinculado) {
        setSelectedVinculados(nextSelectedVinculados)
      }
      if (response.data?.bulk) {
        toast.success(`Se consultaron ${response.data.cartera?.length || 0} carteras`)
      } else {
        toast.success('Cartera consultada correctamente')
      }
    } catch (error) {
      console.error(error)
      toast.error('No fue posible consultar la cartera')
    } finally {
      setLoading(false)
    }
  }

  const handleDispatch = async () => {
    if (!data?.bulk) {
      toast.error('Primero debe consultar una carga masiva')
      return
    }

    if (selectedVinculados.length === 0) {
      toast.error('Debe seleccionar al menos una cartera para enviar')
      return
    }

    setDispatching(true)

    try {
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        fecha1,
        fecha2,
        limit: Number(limit || 20),
        selectedVinculados,
        mode: 'dispatch'
      }, { timeout: 180000 })

      setData(response.data)
      const sent = response.data?.sentCount || 0
      const skipped = response.data?.skippedCount || 0
      toast.success(`Envíos completados: ${sent} enviados, ${skipped} sin teléfono`)
    } catch (error) {
      console.error(error)
      toast.error('No fue posible enviar las carteras por WhatsApp')
    } finally {
      setDispatching(false)
    }
  }

  const toggleVinculadoSelection = (vinculado: number) => {
    setSelectedVinculados(prev => prev.includes(vinculado)
      ? prev.filter(item => item !== vinculado)
      : [...prev, vinculado])
  }

  const removeVinculadoSelection = (vinculado: number) => {
    setSelectedVinculados(prev => prev.filter(item => item !== vinculado))
    toast.success(`Se quitó la selección ${vinculado}`)
  }

  const toggleSelectAll = () => {
    const allIds = filteredSummaries.map(item => item.vinculado)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedVinculados.includes(id))

    setSelectedVinculados(allSelected ? [] : allIds)
  }

  const openPhoneUpdateDialog = (documentoValue: string, phoneValue: string | null) => {
    setContactDialogOpen(false)
    setPhoneUpdateDocumento(documentoValue)
    setPhoneUpdatePhone(phoneValue || '')
    setPhoneDialogOpen(true)
  }

  const openContactCreateDialog = () => {
    setPhoneDialogOpen(false)
    setContactFormDocumento(quickDocument)
    setContactFormCelular('')
    setContactFormTelefono('')
    setContactFormEmail('')
    setContactFormDocAlterno('')
    setContactFormNombreAlterno('')
    setContactFormCelAlterno('')
    setContactDialogOpen(true)
  }

  const handleQuickSelect = () => {
    if (!quickDocument) {
      toast.error('Ingrese la cédula para buscar')
      return
    }

    const match = bulkSummaries.find((item) => String(item.documento) === quickDocument)
    if (!match) {
      toast.error('No se encontró esa cédula en la tabla actual')
      return
    }

    if (!selectedVinculados.includes(match.vinculado)) {
      setSelectedVinculados(prev => [...prev, match.vinculado])
      toast.success(`Se agregó la cartera ${match.vinculado} a la selección`)
    } else {
      toast('La cartera ya estaba seleccionada')
    }
  }

  const selectedVinculadoSet = useMemo(() => new Set(selectedVinculados), [selectedVinculados])

  const handleSavePhone = async () => {
    const phoneToSave = phoneUpdatePhone.trim()

    if (!phoneUpdateDocumento || !phoneToSave) {
      toast.error('Documento y teléfono son obligatorios')
      return
    }

    setSavingPhone(true)

    try {
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        mode: 'upsert-contact',
        documento: phoneUpdateDocumento,
        celular: phoneToSave,
        telefono: phoneToSave
      }, { timeout: 120000 })

      if (response.data?.success) {
        toast.success('Teléfono actualizado en INFOCONTACTO')
        setPhoneDialogOpen(false)
        setPhoneUpdateDocumento('')
        setPhoneUpdatePhone('')

        const displayedPhone = response.data.phone || phoneToSave
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            cartera: prev.cartera.map(item => {
              const itemDocumento = String((item as Record<string, unknown>).documento || '')
              const itemVinculado = String((item as Record<string, unknown>).vinculado || '')
              if (itemDocumento === phoneUpdateDocumento || itemVinculado === phoneUpdateDocumento) {
                return { ...(item as Record<string, unknown>), phone: displayedPhone }
              }
              return item
            })
          }
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('No fue posible actualizar el teléfono')
    } finally {
      setSavingPhone(false)
    }
  }

  const handleSaveContact = async () => {
    const phoneToSave = contactFormTelefono.trim() || contactFormCelular.trim()

    if (!contactFormDocumento || !phoneToSave) {
      toast.error('Documento y teléfono son obligatorios')
      return
    }

    setSavingPhone(true)

    try {
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        mode: 'upsert-contact',
        documento: contactFormDocumento,
        celular: contactFormCelular || phoneToSave,
        telefono: contactFormTelefono || phoneToSave,
        email: contactFormEmail,
        docAlterno: contactFormDocAlterno,
        nombreAlterno: contactFormNombreAlterno,
        celAlterno: contactFormCelAlterno
      }, { timeout: 120000 })

      if (response.data?.success) {
        toast.success('Contacto guardado en INFOCONTACTO')
        setContactDialogOpen(false)
        setContactFormDocumento('')
        setContactFormCelular('')
        setContactFormTelefono('')
        setContactFormEmail('')
        setContactFormDocAlterno('')
        setContactFormNombreAlterno('')
        setContactFormCelAlterno('')

        const displayedPhone = response.data.phone || phoneToSave
        setData(prev => {
          if (!prev) return prev
          return {
            ...prev,
            cartera: prev.cartera.map(item => {
              const itemDocumento = String((item as Record<string, unknown>).documento || '')
              const itemVinculado = String((item as Record<string, unknown>).vinculado || '')
              if (itemDocumento === contactFormDocumento || itemVinculado === contactFormDocumento) {
                return { ...(item as Record<string, unknown>), phone: displayedPhone }
              }
              return item
            })
          }
        })
      }
    } catch (error) {
      console.error(error)
      toast.error('No fue posible guardar el contacto')
    } finally {
      setSavingPhone(false)
    }
  }

  const sumaIngresos = useMemo(() => {
    if (!data?.bulk) {
      return (data?.cartera || []).reduce((acc, item) => acc + Number((item as Record<string, unknown>).ingresos || 0), 0)
    }

    return 0
  }, [data])

  const sumaEgresos = useMemo(() => {
    if (!data?.bulk) {
      return (data?.cartera || []).reduce((acc, item) => acc + Number((item as Record<string, unknown>).egresos || 0), 0)
    }

    return 0
  }, [data])

  const sumaAbonos = useMemo(() => {
    if (!data?.bulk) {
      return (data?.cartera || []).reduce((acc, item) => acc + Number((item as Record<string, unknown>).abonos_cartera || 0), 0)
    }

    return 0
  }, [data])

  const saldoInicial = Number(data?.CarteraInicial?.SALDO_ANT || 0)
  const base = Number(data?.base || 0)
  const total = sumaIngresos + saldoInicial - sumaEgresos - sumaAbonos - base
  const bulkSummaries = (data?.cartera || []) as BulkSummary[]
  const getCompanyGroup = (item: BulkSummary) => {
    const ccosto = String(item.ccosto || '').trim()
    if (ccosto === '39632') return 'servired'
    if (['39629', '39630', '39631'].includes(ccosto)) return 'multired'

    const empresa = String(item.empresa || '').trim().toLowerCase()
    if (empresa.includes('servired') || empresa.includes('jamund')) return 'servired'
    if (empresa.includes('multired') || ['yumbo', 'vijes', 'la cumbre'].includes(empresa)) return 'multired'

    return 'other'
  }

  const filteredSummaries = bulkSummaries.filter(item => {
    const itemCompany = getCompanyGroup(item)

    if (companyFilter === 'servired' && itemCompany !== 'servired') return false
    if (companyFilter === 'multired' && itemCompany !== 'multired') return false

    return true
  })
  const withPhoneCount = bulkSummaries.filter(item => item.isValidForDispatch).length
  const withoutPhoneCount = bulkSummaries.length - withPhoneCount

  return (
    <>
      <Card className='rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm'>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='default'>Carteras consultadas: {data?.bulk ? bulkSummaries.length : data?.cartera?.length || 0}</Badge>
            {data?.bulk && (
              <>
                <Badge variant='success'>Con teléfono: {withPhoneCount}</Badge>
                <Badge variant='warning'>Sin teléfono: {withoutPhoneCount}</Badge>
              </>
            )}
          </div>
          <div className='text-sm text-slate-500'>Filtra por fechas, cédula o cantidad de carteras para cargar la selección.</div>
        </div>

        <form className='grid gap-4 lg:grid-cols-[220px_220px_200px_1fr_auto]' onSubmit={handleSubmit}>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='fecha'>Fecha Inicial</Label>
            <Input
              type='date'
              id='fecha'
              required
              value={fecha1}
              onChange={e => setFecha1(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='fecha2'>Fecha Final</Label>
            <Input
              type='date'
              id='fecha2'
              required
              value={fecha2}
              onChange={e => setFecha2(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='limit'>N° carteras</Label>
            <Input
              type='number'
              id='limit'
              min='1'
              max='200'
              value={limit}
              onChange={e => setLimit(e.target.value)}
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='documento'>Documento</Label>
            <Input
              type='text'
              id='documento'
              placeholder='Buscar por cédula'
              value={documento}
              onChange={e => setDocumento(e.target.value)}
            />
          </div>
          <div className='flex items-end'>
            <Button disabled={loading} type='submit' className='w-full'>
              {loading ? 'Buscando ...' : 'Buscar'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className='mt-4 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl'>
        <div className='grid gap-4 lg:grid-cols-[1.7fr_1fr]'>
          <div>
            <h1 className='text-xl font-semibold'>Carga masiva de carteras</h1>
            <p className='mt-2 max-w-2xl text-sm text-slate-300'>Consulta varias carteras por fechas y, si hay contacto válido en INFOCONTACTO, envía los resultados por WhatsApp a las asesoras seleccionadas.</p>
          </div>
          <div className='flex flex-wrap items-center justify-end gap-3'>
            <label className='flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm'>
              <span>Empresa</span>
              <select
                className='rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none'
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value as 'all' | 'servired' | 'multired')
                }}
              >
                <option value='all'>Todas</option>
                <option value='servired'>Servired</option>
                <option value='multired'>Multired</option>
              </select>
            </label>
            <Button type='button' disabled={!data?.bulk} onClick={toggleSelectAll}>
              {selectedVinculados.length === filteredSummaries.length && filteredSummaries.length > 0 ? 'Quitar selección' : 'Seleccionar todas'}
            </Button>
            <Button type='button' disabled={dispatching || !data?.bulk} onClick={handleDispatch}>
              {dispatching ? 'Enviando ...' : 'Enviar por WhatsApp'}
            </Button>
          </div>
        </div>
      </Card>

      {!data?.bulk && data?.Seller && (
        <Card className='mt-1 flex flex-wrap justify-between items-center gap-3'>
          <div>
            <p className='font-semibold'>INFORMACIÓN VENDEDOR CONSULTADO:</p>
            <p>Nombre: {data?.Seller?.NOMBRES}</p>
            <p>Cargo: {data?.Seller?.NOMBRECARGO}</p>
            <p>Empresa: <span className='px-1'>{data?.Seller?.CCOSTO === '39632' ? 'SERVIRED' : 'MULTIRED'}</span></p>
          </div>
          <Badge className='text-base' variant='warning'>Saldo Inicial: {formatValue(saldoInicial)}</Badge>
        </Card>
      )}

      <Card className='mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='grid gap-4 sm:grid-cols-[1fr_auto]'>
          <div className='flex flex-col gap-3'>
            <span className='text-sm font-medium text-slate-700'>Marcar carteras por cédula</span>
            <Input
              className='min-w-[220px] flex-1'
              type='text'
              placeholder='Ingresa la cédula y luego presiona Agregar selección'
              value={quickDocument}
              onChange={(e) => setQuickDocument(e.target.value)}
            />
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button type='button' onClick={handleQuickSelect}>Agregar selección</Button>
            <Button type='button' className='w-full sm:w-auto' onClick={openContactCreateDialog}>
              Abrir formulario INFOCONTACTO
            </Button>
          </div>
        </div>
      </Card>

      {selectedVinculados.length > 0 && (
        <Card className='mt-4 rounded-3xl border border-slate-200 bg-sky-50 p-4 shadow-sm'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-sm font-semibold text-slate-700'>Seleccionadas:</span>
            {selectedVinculados.map((id) => (
              <Badge key={`sel-${id}`} className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm'>
                <span>{id}</span>
                <button
                  type='button'
                  onClick={() => removeVinculadoSelection(id)}
                  className='rounded-full px-1 text-xs text-red-600 hover:bg-red-100'
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Registrar contacto en INFOCONTACTO</DialogTitle>
            <DialogDescription>Documento y celular son obligatorios. Resto de campos es opcional.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-documento'>Documento</Label>
              <Input
                id='contact-form-documento'
                type='text'
                value={contactFormDocumento}
                onChange={(e) => setContactFormDocumento(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-celular'>Celular</Label>
              <Input
                id='contact-form-celular'
                type='text'
                value={contactFormCelular}
                onChange={(e) => setContactFormCelular(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-telefono'>Teléfono</Label>
              <Input
                id='contact-form-telefono'
                type='text'
                value={contactFormTelefono}
                onChange={(e) => setContactFormTelefono(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-email'>Email</Label>
              <Input
                id='contact-form-email'
                type='email'
                value={contactFormEmail}
                onChange={(e) => setContactFormEmail(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-docalterno'>Documento alterno</Label>
              <Input
                id='contact-form-docalterno'
                type='text'
                value={contactFormDocAlterno}
                onChange={(e) => setContactFormDocAlterno(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='contact-form-nombrealterno'>Nombre alterno</Label>
              <Input
                id='contact-form-nombrealterno'
                type='text'
                value={contactFormNombreAlterno}
                onChange={(e) => setContactFormNombreAlterno(e.target.value)}
              />
            </div>
            <div className='grid gap-2 sm:col-span-2 lg:col-span-2'>
              <Label htmlFor='contact-form-celalterno'>Celular alterno</Label>
              <Input
                id='contact-form-celalterno'
                type='text'
                value={contactFormCelAlterno}
                onChange={(e) => setContactFormCelAlterno(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
            <DialogClose asChild>
              <Button variant='secondary'>Cancelar</Button>
            </DialogClose>
            <Button disabled={savingPhone} onClick={handleSaveContact}>
              {savingPhone ? 'Guardando...' : 'Guardar contacto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Actualizar teléfono</DialogTitle>
            <DialogDescription>Actualiza solo el teléfono del contacto en INFOCONTACTO.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='phone-update-documento'>Documento</Label>
              <Input
                id='phone-update-documento'
                type='text'
                value={phoneUpdateDocumento}
                readOnly
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='phone-update-phone'>Teléfono</Label>
              <Input
                id='phone-update-phone'
                type='text'
                value={phoneUpdatePhone}
                onChange={(e) => setPhoneUpdatePhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
            <DialogClose asChild>
              <Button variant='secondary'>Cancelar</Button>
            </DialogClose>
            <Button disabled={savingPhone} onClick={handleSavePhone}>
              {savingPhone ? 'Guardando...' : 'Actualizar teléfono'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className='mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
        {data?.bulk
          ? (
            <TableRoot className='h-[72vh] overflow-y-auto'>
              <Table>
                <TableHead className='sticky top-0 bg-slate-900 text-white z-30'>
                  <TableRow>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>
                      <input
                        type='checkbox'
                        checked={filteredSummaries.length > 0 && selectedVinculados.length === filteredSummaries.length}
                        onChange={toggleSelectAll}
                        aria-label='Seleccionar todas las asesoras'
                      />
                    </TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Vinculado</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Asesora</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Documento</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Teléfono</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Acciones</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Saldo inicial</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Base</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Ingresos</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Egresos</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Abonos</TableHeaderCell>
                    <TableHeaderCell className='border-slate-700 bg-slate-950 text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Saldo final</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSummaries.map((item, index) => (
                    <TableRow
                      key={`${item.vinculado}-${index}`}
                      className={selectedVinculadoSet.has(item.vinculado) ? 'bg-sky-50 shadow-inner' : 'hover:bg-slate-50'}
                    >
                      <TableCell>
                        <input
                          type='checkbox'
                          checked={selectedVinculadoSet.has(item.vinculado)}
                          onChange={() => toggleVinculadoSelection(item.vinculado)}
                          aria-label={`Seleccionar ${item.sellerName || item.vinculado}`}
                        />
                      </TableCell>
                      <TableCell>{item.vinculado}</TableCell>
                      <TableCell>{item.sellerName || 'N/D'}</TableCell>
                      <TableCell>{item.documento || 'N/D'}</TableCell>
                      <TableCell>{item.phone || 'Sin teléfono'}</TableCell>
                      <TableCell>
                        <Button
                          type='button'
                          variant='secondary'
                          onClick={() => openPhoneUpdateDialog(String(item.documento || item.vinculado), item.phone || null)}
                          disabled={!item.documento && !item.vinculado}
                        >
                          Actualizar teléfono
                        </Button>
                      </TableCell>
                      <TableCell className='text-right'>{formatValue(item.saldoInicial || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.base || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.ingresos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.egresos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.abonos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.saldoFinal || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFoot className='sticky bottom-0 bg-slate-100 z-30'>
                  <TableRow>
                    <TableHeaderCell colSpan={10} scope='row' className='text-right text-sm font-semibold text-slate-700'>Total de carteras:</TableHeaderCell>
                    <TableHeaderCell scope='row' className='text-right text-sm font-semibold text-slate-700'>{filteredSummaries.length}</TableHeaderCell>
                  </TableRow>
                </TableFoot>
              </Table>
            </TableRoot>
            )
          : (
            <>
              <div className='flex justify-end'>
                <Badge className='text-base' variant='warning'>Saldo Inicial: {formatValue(saldoInicial)}</Badge>
              </div>
              <TableRoot className='h-[75vh] overflow-y-auto'>
                <Table>
                  <TableHead className='sticky top-0 bg-slate-900 text-white z-30'>
                    <TableRow>
                      <TableHeaderCell className='text-xs uppercase tracking-[0.12em] text-slate-300'>Fecha</TableHeaderCell>
                      <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Ingresos</TableHeaderCell>
                      <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Egresos</TableHeaderCell>
                      <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Saldo Día</TableHeaderCell>
                      <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Abono Cartera</TableHeaderCell>
                      <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Diferencia día</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data?.cartera?.map((item, index) => (
                      <TableRow key={`${(item as Record<string, unknown>).fecha}-${index}`}>
                        <TableCell>{String((item as Record<string, unknown>).fecha || '').split('T')[0]}</TableCell>
                        <TableCell className='text-right'>{formatValue(Number((item as Record<string, unknown>).ingresos || 0))}</TableCell>
                        <TableCell className='text-right'>{formatValue(Number((item as Record<string, unknown>).egresos || 0))}</TableCell>
                        <TableCell className='text-right'>{formatValue(Number((item as Record<string, unknown>).ingresos || 0) - Number((item as Record<string, unknown>).egresos || 0))}</TableCell>
                        <TableCell className='text-right'>{formatValue(Number((item as Record<string, unknown>).abonos_cartera || 0))}</TableCell>
                        <TableCell className='text-right'>{formatValue(Number((item as Record<string, unknown>).ingresos || 0) - Number((item as Record<string, unknown>).egresos || 0) - Number((item as Record<string, unknown>).abonos_cartera || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFoot className='sticky bottom-0 bg-gray-100 z-30'>
                    <TableRow>
                      <TableHeaderCell colSpan={5} scope='row' className='text-right'>Saldo final cartera:</TableHeaderCell>
                      <TableHeaderCell colSpan={1} scope='row' className='text-right'>{formatValue(total)}</TableHeaderCell>
                    </TableRow>
                  </TableFoot>
                  <TableFoot>
                    <TableRow>
                      <TableHeaderCell colSpan={1} scope='row' className='text-right'>Totales</TableHeaderCell>
                      <TableHeaderCell colSpan={1} scope='row' className='text-right'>{formatValue(sumaIngresos)}</TableHeaderCell>
                      <TableHeaderCell colSpan={1} scope='row' className='text-right'>{formatValue(sumaEgresos)}</TableHeaderCell>
                      <TableHeaderCell colSpan={2} scope='row' className='text-right'>{formatValue(sumaAbonos)}</TableHeaderCell>
                    </TableRow>
                  </TableFoot>
                  <TableFoot>
                    <TableRow>
                      <TableHeaderCell colSpan={5} scope='row' className='text-right'>Base asignada:</TableHeaderCell>
                      <TableHeaderCell colSpan={1} scope='row' className='text-right'><Badge variant='success'>{formatValue(base)}</Badge></TableHeaderCell>
                    </TableRow>
                  </TableFoot>
                </Table>
              </TableRoot>
            </>
            )}
      </Card>

      {loading && (
        <div className='absolute top-36 right-48 left-48 z-30 flex flex-col items-center justify-center'>
          <div className='w-96 rounded-md flex flex-col shadow-lg items-center justify-center gap-4 py-4 px-6 z-30 bg-yellow-300 animate-pulse'>
            <span className='text-lg font-semibold text-gray-800'>Solicitando información ...</span>
            <svg aria-hidden='true' className='inline w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600' viewBox='0 0 100 101' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z' fill='currentColor' />
              <path d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z' fill='currentFill' />
            </svg>
          </div>
        </div>
      )}
    </>
  )
}

import { Badge, Button, Card, Input, Label, Table, TableBody, TableFoot, TableHead, TableHeaderCell, TableRoot, TableRow } from '../components/ui'
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
  const [ccostoFilter, setCcostoFilter] = useState<'all' | '39629' | '39630' | '39631' | '39632'>('all')
  const [quickDocument, setQuickDocument] = useState<string>('')
  const [quickPhone, setQuickPhone] = useState<string>('')
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
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        fecha1,
        fecha2,
        ...(documento ? { vinculado: documento } : {}),
        limit: Number(limit || 20),
        mode: 'report'
      }, { timeout: 180000 })

      setData(response.data)
      setSelectedVinculados([])
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

  const toggleSelectAll = () => {
    const allIds = filteredSummaries.map(item => item.vinculado)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedVinculados.includes(id))

    setSelectedVinculados(allSelected ? [] : allIds)
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

    setSelectedVinculados(prev => prev.includes(match.vinculado) ? prev : [...prev, match.vinculado])
    toast.success(`Se agregó la cartera ${match.vinculado} a la selección`)
  }

  const handleSavePhone = async () => {
    if (!quickDocument || !quickPhone) {
      toast.error('Debe ingresar documento y teléfono')
      return
    }

    setSavingPhone(true)

    try {
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        mode: 'upsert-contact',
        documento: quickDocument,
        telefono: quickPhone
      }, { timeout: 120000 })

      if (response.data?.success) {
        toast.success('Teléfono guardado en INFOCONTACTO')
        setQuickPhone('')
      }
    } catch (error) {
      console.error(error)
      toast.error('No fue posible guardar el teléfono')
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

    if (ccostoFilter !== 'all') {
      const ccosto = String(item.ccosto || '').trim()
      if (ccosto !== ccostoFilter) return false
    }

    return true
  })
  const withPhoneCount = bulkSummaries.filter(item => item.isValidForDispatch).length
  const withoutPhoneCount = bulkSummaries.length - withPhoneCount

  return (
    <>
      <Card className='flex flex-wrap justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <Badge variant='default'>Carteras consultadas: {data?.bulk ? bulkSummaries.length : data?.cartera?.length || 0}</Badge>
          {data?.bulk && (
            <>
              <Badge variant='success'>Con teléfono: {withPhoneCount}</Badge>
              <Badge variant='warning'>Sin teléfono: {withoutPhoneCount}</Badge>
            </>
          )}
        </div>
        <form className='flex flex-wrap items-end gap-4' onSubmit={handleSubmit}>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='fecha'>Fecha Inicial</Label>
            <Input
              type='date'
              id='fecha'
              required
              value={fecha1}
              onChange={e => setFecha1(e.target.value)}
            />
          </div>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='fecha2'>Fecha Final</Label>
            <Input
              type='date'
              id='fecha2'
              required
              value={fecha2}
              onChange={e => setFecha2(e.target.value)}
            />
          </div>
          <div className='flex gap-2 items-center'>
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
          <div className='flex gap-2 items-center'>
            <Label htmlFor='documento'>Documento (opcional)</Label>
            <Input
              type='text'
              id='documento'
              placeholder='Solo si desea una sola cartera'
              value={documento}
              onChange={e => setDocumento(e.target.value)}
            />
          </div>
          <Button disabled={loading} type='submit'>
            {loading ? 'Buscando ...' : 'Buscar'}
          </Button>
        </form>
      </Card>

      <Card className='mt-1 flex flex-wrap justify-between items-center gap-3'>
        <div>
          <h1 className='font-semibold'>CARGA MASIVA DE CARTERAS</h1>
          <p className='text-sm text-gray-600'>Consulta varias carteras por fechas y, si hay contacto válido en INFOCONTACTO, puedes enviarlas por WhatsApp a las asesoras seleccionadas.</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <label className='flex items-center gap-2 text-sm'>
            <span>Empresa</span>
            <select
              className='rounded border border-gray-300 px-2 py-1 text-sm'
              value={companyFilter}
              onChange={(e) => {
                setCompanyFilter(e.target.value as 'all' | 'servired' | 'multired')
                setSelectedVinculados([])
              }}
            >
              <option value='all'>Todas</option>
              <option value='servired'>Servired</option>
              <option value='multired'>Multired</option>
            </select>
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <span>CC</span>
            <select
              className='rounded border border-gray-300 px-2 py-1 text-sm'
              value={ccostoFilter}
              onChange={(e) => {
                setCcostoFilter(e.target.value as 'all' | '39629' | '39630' | '39631' | '39632')
                setSelectedVinculados([])
              }}
            >
              <option value='all'>Todos</option>
              {companyFilter === 'servired' && <option value='39632'>39632 Jamundí</option>}
              {companyFilter === 'multired' && (
                <>
                  <option value='39629'>39629 Yumbo</option>
                  <option value='39630'>39630 Vijes</option>
                  <option value='39631'>39631 La Cumbre</option>
                </>
              )}
              {companyFilter === 'all' && (
                <>
                  <option value='39629'>39629 Yumbo</option>
                  <option value='39630'>39630 Vijes</option>
                  <option value='39631'>39631 La Cumbre</option>
                  <option value='39632'>39632 Jamundí</option>
                </>
              )}
            </select>
          </label>
          <Button type='button' disabled={!data?.bulk} onClick={toggleSelectAll}>
            {selectedVinculados.length === filteredSummaries.length && filteredSummaries.length > 0 ? 'Quitar selección' : 'Seleccionar todas'}
          </Button>
          <Button type='button' disabled={dispatching || !data?.bulk} onClick={handleDispatch}>
            {dispatching ? 'Enviando ...' : 'Enviar por WhatsApp'}
          </Button>
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

      <Card className='mt-1 flex flex-wrap items-center gap-3'>
        <div className='flex items-center gap-2'>
          <Input
            type='text'
            placeholder='Cédula para seleccionar'
            value={quickDocument}
            onChange={(e) => setQuickDocument(e.target.value)}
          />
          <Button type='button' onClick={handleQuickSelect}>Agregar selección</Button>
        </div>
        <div className='flex items-center gap-2'>
          <Input
            type='text'
            placeholder='Teléfono para INFOCONTACTO'
            value={quickPhone}
            onChange={(e) => setQuickPhone(e.target.value)}
          />
          <Button type='button' disabled={savingPhone} onClick={handleSavePhone}>
            {savingPhone ? 'Guardando...' : 'Guardar teléfono'}
          </Button>
        </div>
      </Card>

      <Card className='mt-1'>
        {data?.bulk
          ? (
            <TableRoot className='h-[75vh] overflow-y-auto'>
              <Table>
                <TableHead className='sticky top-0 bg-gray-100 z-30'>
                  <TableRow>
                    <TableHeaderCell>
                      <input
                        type='checkbox'
                        checked={filteredSummaries.length > 0 && selectedVinculados.length === filteredSummaries.length}
                        onChange={toggleSelectAll}
                        aria-label='Seleccionar todas las asesoras'
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>Vinculado</TableHeaderCell>
                    <TableHeaderCell>Asesora</TableHeaderCell>
                    <TableHeaderCell>Documento</TableHeaderCell>
                    <TableHeaderCell>Teléfono</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Saldo inicial</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Base</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Ingresos</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Egresos</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Abonos</TableHeaderCell>
                    <TableHeaderCell className='text-right'>Saldo final</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSummaries.map((item, index) => (
                    <TableRow key={`${item.vinculado}-${index}`}>
                      <TableCell>
                        <input
                          type='checkbox'
                          checked={selectedVinculados.includes(item.vinculado)}
                          onChange={() => toggleVinculadoSelection(item.vinculado)}
                          aria-label={`Seleccionar ${item.sellerName || item.vinculado}`}
                        />
                      </TableCell>
                      <TableCell>{item.vinculado}</TableCell>
                      <TableCell>{item.sellerName || 'N/D'}</TableCell>
                      <TableCell>{item.documento || 'N/D'}</TableCell>
                      <TableCell>{item.phone || 'Sin teléfono'}</TableCell>
                      <TableCell>{item.isValidForDispatch ? 'Válida para envío' : item.validationReason || 'No válida'}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.saldoInicial || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.base || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.ingresos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.egresos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.abonos || 0)}</TableCell>
                      <TableCell className='text-right'>{formatValue(item.saldoFinal || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFoot className='sticky bottom-0 bg-gray-100 z-30'>
                  <TableRow>
                    <TableHeaderCell colSpan={10} scope='row' className='text-right'>Total de carteras:</TableHeaderCell>
                    <TableHeaderCell scope='row' className='text-right'>{filteredSummaries.length}</TableHeaderCell>
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
                  <TableHead className='sticky top-0 bg-gray-100 z-30'>
                    <TableRow>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell className='text-right'>Ingresos</TableHeaderCell>
                      <TableHeaderCell className='text-right'>Egresos</TableHeaderCell>
                      <TableHeaderCell className='text-right'>Saldo Día</TableHeaderCell>
                      <TableHeaderCell className='text-right'>Abono Cartera</TableHeaderCell>
                      <TableHeaderCell className='text-right'>Diferencia día</TableHeaderCell>
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

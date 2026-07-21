import { FormEvent } from 'react'
import { Badge, Button, Card, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Table, TableBody, TableFoot, TableHead, TableHeaderCell, TableRoot, TableRow } from '../../components/ui'
import { TableCell } from '../../components/ui/TableTremor'
import { formatValue } from '../../utils/funtions'
import { BulkSummary, ReportResponse } from './types'

export type SearchFormProps = {
    fecha1: string
    fecha2: string
    limit: string
    documento: string
    loading: boolean
    setFecha1: (value: string) => void
    setFecha2: (value: string) => void
    setLimit: (value: string) => void
    setDocumento: (value: string) => void
    onSubmit: (event: FormEvent) => Promise<void>
}

export function SearchForm ({
  fecha1,
  fecha2,
  limit,
  documento,
  loading,
  setFecha1,
  setFecha2,
  setLimit,
  setDocumento,
  onSubmit
}: SearchFormProps) {
  return (
        <Card className='rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='default'>Consulta de carteras</Badge>
                </div>
                <div className='text-sm text-slate-500'>Filtra por fechas, cédula o cantidad de carteras.</div>
            </div>

            <form className='grid gap-4 lg:grid-cols-[220px_220px_200px_1fr_auto]' onSubmit={onSubmit}>
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
  )
}

export type ReportHeaderProps = {
    bulkActive: boolean
    totalCount: number
    withPhoneCount: number
    withoutPhoneCount: number
    companyFilter: 'all' | 'servired' | 'multired'
    setCompanyFilter: (value: 'all' | 'servired' | 'multired') => void
    selectedVinculadosLength: number
    filteredSummariesLength: number
    toggleSelectAll: () => void
    handleDispatch: () => void
    dispatching: boolean
}

export function ReportHeader ({
  bulkActive,
  companyFilter,
  setCompanyFilter,
  selectedVinculadosLength,
  filteredSummariesLength,
  toggleSelectAll,
  handleDispatch,
  dispatching
}: ReportHeaderProps) {
  return (
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
                            onChange={(e) => setCompanyFilter(e.target.value as 'all' | 'servired' | 'multired')}
                        >
                            <option value='all'>Todas</option>
                            <option value='servired'>Servired</option>
                            <option value='multired'>Multired</option>
                        </select>
                    </label>
                    <Button type='button' disabled={!bulkActive} onClick={toggleSelectAll}>
                        {selectedVinculadosLength === filteredSummariesLength && filteredSummariesLength > 0 ? 'Quitar selección' : 'Seleccionar todas'}
                    </Button>
                    <Button type='button' disabled={dispatching || !bulkActive} onClick={handleDispatch}>
                        {dispatching ? 'Enviando ...' : 'Enviar por WhatsApp'}
                    </Button>
                </div>
            </div>
        </Card>
  )
}

export type QuickSelectionPanelProps = {
    quickDocument: string
    setQuickDocument: (value: string) => void
    onQuickSelect: () => void
    onOpenContactDialog: () => void
}

export function QuickSelectionPanel ({ quickDocument, setQuickDocument, onQuickSelect, onOpenContactDialog }: QuickSelectionPanelProps) {
  return (
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
                    <Button type='button' onClick={onQuickSelect}>Agregar selección</Button>
                    <Button type='button' className='w-full sm:w-auto' onClick={onOpenContactDialog}>
                        Abrir formulario INFOCONTACTO
                    </Button>
                </div>
            </div>
        </Card>
  )
}

export type SelectionChipsProps = {
    selectedVinculados: number[]
    removeSelection: (id: number) => void
}

export function SelectionChips ({ selectedVinculados, removeSelection }: SelectionChipsProps) {
  if (selectedVinculados.length === 0) {
    return null
  }

  return (
        <Card className='mt-4 rounded-3xl border border-slate-200 bg-sky-50 p-4 shadow-sm'>
            <div className='flex flex-wrap items-center gap-3'>
                <span className='text-sm font-semibold text-slate-700'>Seleccionadas:</span>
                {selectedVinculados.map((id) => (
                    <Badge key={`sel-${id}`} className='inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm'>
                        <span>{id}</span>
                        <button
                            type='button'
                            onClick={() => removeSelection(id)}
                            className='rounded-full px-1 text-xs text-red-600 hover:bg-red-100'
                        >
                            x
                        </button>
                    </Badge>
                ))}
            </div>
        </Card>
  )
}

export type ContactDialogProps = {
    open: boolean
    setOpen: (value: boolean) => void
    contactFormDocumento: string
    contactFormCelular: string
    contactFormTelefono: string
    contactFormEmail: string
    contactFormDocAlterno: string
    contactFormNombreAlterno: string
    contactFormCelAlterno: string
    setContactFormDocumento: (value: string) => void
    setContactFormCelular: (value: string) => void
    setContactFormTelefono: (value: string) => void
    setContactFormEmail: (value: string) => void
    setContactFormDocAlterno: (value: string) => void
    setContactFormNombreAlterno: (value: string) => void
    setContactFormCelAlterno: (value: string) => void
    saving: boolean
    onSave: () => Promise<void>
}

export function ContactDialog ({
  open,
  setOpen,
  contactFormDocumento,
  contactFormCelular,
  contactFormTelefono,
  contactFormEmail,
  contactFormDocAlterno,
  contactFormNombreAlterno,
  contactFormCelAlterno,
  setContactFormDocumento,
  setContactFormCelular,
  setContactFormTelefono,
  setContactFormEmail,
  setContactFormDocAlterno,
  setContactFormNombreAlterno,
  setContactFormCelAlterno,
  saving,
  onSave
}: ContactDialogProps) {
  return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                    <Button disabled={saving} onClick={onSave}>
                        {saving ? 'Guardando...' : 'Guardar contacto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
  )
}

export type PhoneDialogProps = {
    open: boolean
    setOpen: (value: boolean) => void
    documento: string
    phone: string
    setPhone: (value: string) => void
    saving: boolean
    onSave: () => Promise<void>
}

export function PhoneDialog ({
  open,
  setOpen,
  documento,
  phone,
  setPhone,
  saving,
  onSave
}: PhoneDialogProps) {
  return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                            value={documento}
                            readOnly
                        />
                    </div>
                    <div className='grid gap-2'>
                        <Label htmlFor='phone-update-phone'>Teléfono</Label>
                        <Input
                            id='phone-update-phone'
                            type='text'
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
                    <DialogClose asChild>
                        <Button variant='secondary'>Cancelar</Button>
                    </DialogClose>
                    <Button disabled={saving} onClick={onSave}>
                        {saving ? 'Guardando...' : 'Actualizar teléfono'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
  )
}

export type SellerInfoCardProps = {
    seller: ReportResponse['Seller']
    saldoInicial: number
}

export function SellerInfoCard ({ seller, saldoInicial }: SellerInfoCardProps) {
  if (!seller) {
    return null
  }

  return (
        <Card className='mt-1 flex flex-wrap justify-between items-center gap-3'>
            <div>
                <p className='font-semibold'>INFORMACIÓN VENDEDOR CONSULTADO:</p>
                <p>Nombre: {seller.NOMBRES}</p>
                <p>Cargo: {seller.NOMBRECARGO}</p>
                <p>Empresa: <span className='px-1'>{seller.CCOSTO === '39632' ? 'SERVIRED' : 'MULTIRED'}</span></p>
            </div>
            <Badge className='text-base' variant='warning'>Saldo Inicial: {formatValue(saldoInicial)}</Badge>
        </Card>
  )
}

export type ReportTableProps = {
    data: ReportResponse | null
    filteredSummaries: BulkSummary[]
    selectedVinculadoSet: Set<number>
    selectedVinculados: number[]
    toggleSelectAll: () => void
    toggleVinculadoSelection: (vinculado: number) => void
    openPhoneUpdateDialog: (documento: string, phone: string | null) => void
    withPhoneCount: number
    withoutPhoneCount: number
}

export function ReportTable ({
  data,
  filteredSummaries,
  selectedVinculadoSet,
  selectedVinculados,
  toggleSelectAll,
  toggleVinculadoSelection,
  openPhoneUpdateDialog,
  withPhoneCount,
  withoutPhoneCount
}: ReportTableProps) {
  const getNumberValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'number') return value
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value.replace(/[^0-9.-]+/g, ''))
        if (!Number.isNaN(parsed)) return parsed
      }
    }
    return 0
  }

  const hasSummaryRows = filteredSummaries.length > 0 || data?.bulk

  return (
        <Card className='mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
            {hasSummaryRows && (
                <div className='flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-sm font-semibold text-slate-700'>Resultados actuales</p>
                        <p className='text-sm text-slate-500'>Mostrando {filteredSummaries.length} carteras en la tabla</p>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant='default'>Seleccionadas: {selectedVinculados.length}</Badge>
                        <Badge variant='success'>Con teléfono: {withPhoneCount}</Badge>
                        <Badge variant='warning'>Sin teléfono: {withoutPhoneCount}</Badge>
                    </div>
                </div>
            )}

            <TableRoot className='h-[72vh] overflow-y-auto'>
                <Table>
                    {hasSummaryRows
                      ? (
                            <>
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
                                        <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Empresa</TableHeaderCell>
                                        <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Teléfono</TableHeaderCell>
                                        <TableHeaderCell className='border-slate-700 bg-slate-950 text-left text-xs uppercase tracking-[0.12em] text-slate-300'>Acciones</TableHeaderCell>
                                        <TableHeaderCell className='text-xs uppercase tracking-[0.12em] text-slate-300'>Base</TableHeaderCell>
                                        <TableHeaderCell className='text-xs uppercase tracking-[0.12em] text-slate-300'>Saldo Ant.</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Débito</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Crédito</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Nuevo Saldo</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Cartera</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Rechazados</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Aceptados</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Pendiente Conteo</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Venta Bnet</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Cuadre Web</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Anulados</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(filteredSummaries.length > 0 ? filteredSummaries : data?.cartera || []).map((item, index) => {
                                      const row = item as Record<string, unknown>
                                      return (
                                            <TableRow
                                                key={`${(item as BulkSummary).vinculado || String(row.documento || index)}-${index}`}
                                                className={selectedVinculadoSet.has((item as BulkSummary).vinculado || 0) ? 'bg-sky-50 shadow-inner' : 'hover:bg-slate-50'}
                                            >
                                                <TableCell>
                                                    <input
                                                        type='checkbox'
                                                        checked={selectedVinculadoSet.has((item as BulkSummary).vinculado || 0)}
                                                        onChange={() => toggleVinculadoSelection((item as BulkSummary).vinculado || 0)}
                                                        aria-label={`Seleccionar ${(item as BulkSummary).sellerName || row.vinculado || row.documento}`}
                                                    />
                                                </TableCell>
                                                <TableCell>{(item as BulkSummary).vinculado || String(row.vinculado || row.documento || 'N/D')}</TableCell>
                                                <TableCell>{(item as BulkSummary).sellerName || 'N/D'}</TableCell>
                                                <TableCell>{(item as BulkSummary).documento || String(row.documento || row.vinculado || 'N/D')}</TableCell>
                                                <TableCell>{String((item as BulkSummary).empresa === '39632' ? 'Servired' : 'Multired')}</TableCell>
                                                <TableCell>{(item as BulkSummary).phone || 'Sin teléfono'}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        type='button'
                                                        variant='secondary'
                                                        onClick={() => openPhoneUpdateDialog(String((item as BulkSummary).documento || row.vinculado || ''), (item as BulkSummary).phone || null)}
                                                        disabled={!((item as BulkSummary).documento || row.vinculado)}
                                                    >
                                                        Actualizar teléfono
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{formatValue(getNumberValue(row, ['Base', 'BASE', 'base']))}</TableCell>
                                                <TableCell>{formatValue(getNumberValue(row, ['SaldoAnt', 'SALDO_ANT', 'saldoInicial']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Debito', 'DEBITO', 'ingresos']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Credito', 'CREDITO', 'egresos']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['NuevoSaldo', 'NUEVOSALDO', 'saldoFinal']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Cartera', 'SALDO_ANT', 'cartera']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Rechazados', 'RECHAZADOS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Aceptados', 'ACEPTADOS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['PendientesCont', 'PENDIENTES_CONT', 'pendienteConteo']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Vtabnet', 'VTABNET']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['CuadreWeb', 'CUADRE_WEB', 'VTASIISS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Anulados', 'ANULADOS', 'VTA_S1']))}</TableCell>
                                            </TableRow>
                                      )
                                    })}
                                </TableBody>
                                <TableFoot className='sticky bottom-0 bg-slate-100 z-30'>
                                    <TableRow>
                                        <TableHeaderCell colSpan={10} scope='row' className='text-right text-sm font-semibold text-slate-700'>Total de carteras:</TableHeaderCell>
                                        <TableHeaderCell scope='row' className='text-right text-sm font-semibold text-slate-700'>{filteredSummaries.length}</TableHeaderCell>
                                    </TableRow>
                                </TableFoot>
                            </>
                        )
                      : (
                            <>
                                <TableHead className='sticky top-0 bg-slate-900 text-white z-30'>
                                    <TableRow>
                                        <TableHeaderCell className='text-xs uppercase tracking-[0.12em] text-slate-300'>Base</TableHeaderCell>
                                        <TableHeaderCell className='text-xs uppercase tracking-[0.12em] text-slate-300'>Saldo Ant.</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Débito</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Crédito</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Nuevo Saldo</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Cartera</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Rechazados</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Aceptados</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Pendiente Conteo</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Venta Bnet</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Cuadre Web</TableHeaderCell>
                                        <TableHeaderCell className='text-right text-xs uppercase tracking-[0.12em] text-slate-300'>Anulados</TableHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data?.cartera?.map((item, index) => {
                                      const row = item as Record<string, unknown>
                                      return (
                                            <TableRow key={`${row.vinculado || index}-${index}`}>
                                                <TableCell>{formatValue(getNumberValue(row, ['Base', 'BASE', 'base']))}</TableCell>
                                                <TableCell>{formatValue(getNumberValue(row, ['SaldoAnt', 'SALDO_ANT', 'saldoInicial']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Debito', 'DEBITO', 'ingresos']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Credito', 'CREDITO', 'egresos']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['NuevoSaldo', 'NUEVOSALDO', 'saldoFinal']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Cartera', 'SALDO_ANT', 'cartera']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Rechazados', 'RECHAZADOS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Aceptados', 'ACEPTADOS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['PendientesCont', 'PENDIENTES_CONT', 'pendienteConteo']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Vtabnet', 'VTABNET']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['CuadreWeb', 'CUADRE_WEB', 'VTASIISS']))}</TableCell>
                                                <TableCell className='text-right'>{formatValue(getNumberValue(row, ['Anulados', 'ANULADOS', 'VTA_S1']))}</TableCell>
                                            </TableRow>
                                      )
                                    })}
                                </TableBody>
                                <TableFoot className='sticky bottom-0 bg-gray-100 z-30'>
                                    <TableRow>
                                        <TableHeaderCell colSpan={11} scope='row' className='text-right'>Total de carteras:</TableHeaderCell>
                                        <TableHeaderCell scope='row' className='text-right'>{formatValue(data?.cartera ? (data.cartera.length) : 0)}</TableHeaderCell>
                                    </TableRow>
                                </TableFoot>
                            </>
                        )}
                </Table>
            </TableRoot>
        </Card>
  )
}

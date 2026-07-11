import { FormEvent, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { API_URL } from '../../utils/contanst'
import { BulkSummary, ReportResponse } from './types'
import { ContactDialog, PhoneDialog, QuickSelectionPanel, ReportHeader, ReportTable, SearchForm, SelectionChips, SellerInfoCard } from './ReportMngrWspComponents'

export default function ReportMngrWspPage () {
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
  const saldoInicial = Number(data?.CarteraInicial?.SALDO_ANT || 0)

  return (
    <>
      <SearchForm
        fecha1={fecha1}
        fecha2={fecha2}
        limit={limit}
        documento={documento}
        loading={loading}
        setFecha1={setFecha1}
        setFecha2={setFecha2}
        setLimit={setLimit}
        setDocumento={setDocumento}
        onSubmit={handleSubmit}
      />

      <ReportHeader
        bulkActive={Boolean(data?.bulk)}
        totalCount={bulkSummaries.length}
        withPhoneCount={withPhoneCount}
        withoutPhoneCount={withoutPhoneCount}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
        selectedVinculadosLength={selectedVinculados.length}
        filteredSummariesLength={filteredSummaries.length}
        toggleSelectAll={toggleSelectAll}
        handleDispatch={handleDispatch}
        dispatching={dispatching}
      />

      <SellerInfoCard seller={data?.Seller} saldoInicial={saldoInicial} />

      <QuickSelectionPanel
        quickDocument={quickDocument}
        setQuickDocument={setQuickDocument}
        onQuickSelect={handleQuickSelect}
        onOpenContactDialog={openContactCreateDialog}
      />

      <SelectionChips selectedVinculados={selectedVinculados} removeSelection={removeVinculadoSelection} />

      <ContactDialog
        open={contactDialogOpen}
        setOpen={setContactDialogOpen}
        contactFormDocumento={contactFormDocumento}
        contactFormCelular={contactFormCelular}
        contactFormTelefono={contactFormTelefono}
        contactFormEmail={contactFormEmail}
        contactFormDocAlterno={contactFormDocAlterno}
        contactFormNombreAlterno={contactFormNombreAlterno}
        contactFormCelAlterno={contactFormCelAlterno}
        setContactFormDocumento={setContactFormDocumento}
        setContactFormCelular={setContactFormCelular}
        setContactFormTelefono={setContactFormTelefono}
        setContactFormEmail={setContactFormEmail}
        setContactFormDocAlterno={setContactFormDocAlterno}
        setContactFormNombreAlterno={setContactFormNombreAlterno}
        setContactFormCelAlterno={setContactFormCelAlterno}
        saving={savingPhone}
        onSave={handleSaveContact}
      />

      <PhoneDialog
        open={phoneDialogOpen}
        setOpen={setPhoneDialogOpen}
        documento={phoneUpdateDocumento}
        phone={phoneUpdatePhone}
        setPhone={setPhoneUpdatePhone}
        saving={savingPhone}
        onSave={handleSavePhone}
      />

      <ReportTable
        data={data}
        filteredSummaries={filteredSummaries}
        selectedVinculadoSet={selectedVinculadoSet}
        selectedVinculados={selectedVinculados}
        toggleSelectAll={toggleSelectAll}
        toggleVinculadoSelection={toggleVinculadoSelection}
        openPhoneUpdateDialog={openPhoneUpdateDialog}
        withPhoneCount={withPhoneCount}
        withoutPhoneCount={withoutPhoneCount}
      />

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

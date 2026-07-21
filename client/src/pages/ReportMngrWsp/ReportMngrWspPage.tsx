import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { API_URL } from '../../utils/contanst'
import { BulkSummary, ReportResponse } from './types'
import { ContactDialog, PhoneDialog, QuickSelectionPanel, ReportHeader, ReportTable, SelectionChips, SellerInfoCard } from './ReportMngrWspComponents'

export default function ReportMngrWspPage () {
  const [data, setData] = useState<ReportResponse | null>(null)
  // const [documento, setDocumento] = useState<string>('')
  const [limit] = useState<string>('20')
  const [loading] = useState<boolean>(false)
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

  const bulkSummaries = normalizeCartera(data?.cartera || [])

  function normalizeCartera (items: unknown[] = []): BulkSummary[] {
    return items.map(item => {
      const row = item as Record<string, unknown> & { Seller?: Record<string, unknown> }
      const numberValue = (value: unknown): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string' && value.trim() !== '') {
          const cleaned = value.replace(/[^0-9-]+/g, '')
          const parsed = Number(cleaned)
          return Number.isNaN(parsed) ? 0 : parsed
        }
        return 0
      }

      const normalized = {
        ...row,
        vinculado: Number(row.vinculado ?? row.VINCULADO ?? 0),
        documento: String(row.documento ?? row.DOCUMENTO ?? row.vinculado ?? row.VINCULADO ?? ''),
        empresa: String(row.empresa ?? row.EMPRESA ?? row.empresa ?? ''),
        sellerName: row.sellerName ?? (typeof row.Seller === 'object' && row.Seller !== null ? String(row.Seller.NOMBRES ?? '') : null) ?? null,
        cargo: row.cargo ?? row.Cargo ?? row.cargo ?? null,
        saldoInicial: row.SALDO_ANT ?? row.saldoInicial ?? row.SaldoAnt ?? numberValue(row.SALDO_ANT ?? row.saldoInicial ?? row.SaldoAnt),
        Base: row.BASE ?? row.base ?? row.Base ?? numberValue(row.BASE ?? row.base ?? row.Base),
        SaldoAnt: row.SALDO_ANT ?? row.saldoInicial ?? row.SaldoAnt ?? numberValue(row.SALDO_ANT ?? row.saldoInicial ?? row.SaldoAnt),
        Debito: row.DEBITO ?? row.ingresos ?? row.Debito ?? numberValue(row.DEBITO ?? row.ingresos ?? row.Debito),
        Credito: row.CREDITO ?? row.egresos ?? row.Credito ?? numberValue(row.CREDITO ?? row.egresos ?? row.Credito),
        NuevoSaldo: row.NUEVOSALDO ?? row.NuevoSaldo ?? row.nuevoSaldo ?? row.saldoFinal ?? numberValue(row.NUEVOSALDO ?? row.NuevoSaldo ?? row.nuevoSaldo ?? row.saldoFinal),
        Cartera: row.Cartera ?? row.cartera ?? row.SALDO_ANT ?? numberValue(row.Cartera ?? row.cartera ?? row.SALDO_ANT),
        Rechazados: row.RECHAZADOS ?? row.Rechazados ?? row.rechazados ?? numberValue(row.RECHAZADOS ?? row.Rechazados ?? row.rechazados),
        Aceptados: row.ACEPTADOS ?? row.Aceptados ?? numberValue(row.ACEPTADOS ?? row.Aceptados),
        PendientesCont: row.PENDIENTES_CONT ?? row.PendientesCont ?? row.pendienteConteo ?? numberValue(row.PENDIENTES_CONT ?? row.PendientesCont ?? row.pendienteConteo),
        Vtabnet: row.VTABNET ?? row.Vtabnet ?? row.vtabnet ?? numberValue(row.VTABNET ?? row.Vtabnet ?? row.vtabnet),
        CuadreWeb: row.CUADRE_WEB ?? row.VTASIISS ?? row.CuadreWeb ?? row.vtasiss ?? numberValue(row.CUADRE_WEB ?? row.VTASIISS ?? row.CuadreWeb ?? row.vtasiss),
        Anulados: row.ANULADOS ?? row.VTA_S1 ?? row.Anulados ?? row.vta_s1 ?? numberValue(row.ANULADOS ?? row.VTA_S1 ?? row.Anulados ?? row.vta_s1),
        phone: row.phone ?? row.PHONE ?? null,
        hasContact: Boolean(row.hasContact ?? row.HASCONTACT ?? row.hasContact),
        isValidForDispatch: Boolean(row.isValidForDispatch ?? row.ISVALIDFORDISPATCH ?? row.isValidForDispatch),
        validationReason: String(row.validationReason ?? row.VALIDATIONREASON ?? '') || null,
        ccosto: row.ccosto ?? row.CCOSTO ?? row.ccosto ?? null
      }

      return normalized as unknown as BulkSummary
    })
  }
  const getCompanyGroup = (item: BulkSummary) => {
    console.log('[getCompanyGroup] empresa=', item.empresa, 'ccosto=', item.ccosto)
    const ccosto = String(item.ccosto || '').trim()
    if (ccosto === '39632') return 'servired'
    if (['39629', '39630', '39631'].includes(ccosto)) return 'multired'

    const empresaRaw = String(item.empresa || '').trim().toLowerCase()
    // Manejar códigos numéricos de empresa (101 -> Servired, 102 -> Multired)
    if (empresaRaw === '101' || empresaRaw.includes('101')) return 'servired'
    if (empresaRaw === '102' || empresaRaw.includes('102')) return 'multired'

    if (empresaRaw.includes('servired') || empresaRaw.includes('jamund')) return 'servired'
    if (empresaRaw.includes('multired') || ['yumbo', 'vijes', 'la cumbre'].some(n => empresaRaw.includes(n))) return 'multired'

    return 'other'
  }

  const filteredSummaries = bulkSummaries.filter(item => {
    const itemCompany = getCompanyGroup(item)
    if (companyFilter === 'servired' && itemCompany !== 'servired') return false
    if (companyFilter === 'multired' && itemCompany !== 'multired') return false
    return true
  })

  const positiveFilteredSummaries = filteredSummaries.filter(item => Number(item.saldoInicial || 0) > 0)
  const [displayedSummaries, setDisplayedSummaries] = useState<BulkSummary[]>([])
  const [loadingDetallado, setLoadingDetallado] = useState<boolean>(false)

  const handleDispatch = async () => {
    if (selectedVinculados.length === 0) {
      toast.error('Debe seleccionar al menos una cartera para enviar')
      return
    }

    setDispatching(true)

    try {
      const response = await axios.post(`${API_URL}/carteraMngrWsp`, {
        limit: Number(limit || 20),
        selectedVinculados,
        mode: 'dispatch'
      }, { timeout: 180000 })

      console.log('dispatch response', response.data)
      const normalizedData = { ...response.data, cartera: normalizeCartera(response.data?.cartera || []) }
      setData(normalizedData)
      const sent = normalizedData?.sentCount || 0
      const skipped = response.data?.skippedCount || 0
      const failures = response.data?.failures || []

      if (failures.length > 0) {
        const failureText = failures
          .map((failure: { phone?: string; message?: string }) => `Error enviando WhatsApp a ${failure.phone || 'N/D'}: ${failure.message || 'Error desconocido'}`)
          .join('\n')

        toast.error(failureText, { duration: 10000 })
      }

      toast.success(`Envíos completados: ${sent} enviados, ${skipped} sin teléfono`)
    } catch (error) {
      console.error('dispatch error', error)
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
    const allIds = displayedSource.map(item => Number(item.vinculado))
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

        // actualizar listado mostrado (detallado)
        setDisplayedSummaries(prev => prev.map(s => {
          const sDocumento = String(s.documento || '')
          const sVinc = String(s.vinculado || '')
          if (sDocumento === phoneUpdateDocumento || sVinc === phoneUpdateDocumento) {
            return { ...s, phone: displayedPhone }
          }
          return s
        }))
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

        // actualizar listado mostrado (detallado)
        setDisplayedSummaries(prev => prev.map(s => {
          const sDocumento = String(s.documento || '')
          const sVinc = String(s.vinculado || '')
          if (sDocumento === contactFormDocumento || sVinc === contactFormDocumento) {
            return { ...s, phone: displayedPhone }
          }
          return s
        }))
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

    const match = displayedSummaries.filter(item => Number(item.saldoInicial || 0) > 0)
      .find((item) => String(item.documento) === quickDocument)
    if (!match) {
      toast.error('No se encontró esa cédula en la tabla actual')
      return
    }

    const selectedId = Number(match.vinculado)
    if (!selectedVinculados.includes(selectedId)) {
      setSelectedVinculados(prev => [...prev, selectedId])
      toast.success(`Se agregó la cartera ${selectedId} a la selección`)
    } else {
      toast('La cartera ya estaba seleccionada')
    }
  }

  useEffect(() => {
    // cargar detallado desde nuevo endpoint cada vez que cambie el filtro de empresa
    const load = async () => {
      try {
        setLoadingDetallado(true)
        const empresaParam = companyFilter === 'servired' ? '101' : companyFilter === 'multired' ? '102' : '0'
        const resp = await axios.get(`${API_URL}/carteraDetalladoWsp?empresa=${empresaParam}&abs=false`)
        setDisplayedSummaries(normalizeCartera(resp.data?.cartera || []))
      } catch (err) {
        console.error('Error cargando detallado WSP', err)
      } finally {
        setLoadingDetallado(false)
      }
    }

    load().catch(err => console.error('load error', err))
  }, [companyFilter])

  const selectedVinculadoSet = useMemo(() => new Set(selectedVinculados), [selectedVinculados])
  const saldoInicial = Number(data?.CarteraInicial?.SALDO_ANT || 0)
  const positiveDisplayedSummaries = displayedSummaries.filter(item => Number(item.saldoInicial || 0) > 0)

  // prepare displayed summaries: prefer backend bulk, otherwise use detallado fetched
  const displayedSource = useMemo(() => {
    const source = data?.bulk ? positiveFilteredSummaries : positiveDisplayedSummaries
    if (!selectedVinculados.length) return source

    const selectedOrder = new Map<number, number>()
    selectedVinculados.forEach((id, index) => {
      selectedOrder.set(id, index)
    })

    return [...source].sort((a, b) => {
      const aSelected = selectedOrder.has(Number(a.vinculado || 0))
      const bSelected = selectedOrder.has(Number(b.vinculado || 0))

      if (aSelected && bSelected) {
        return (selectedOrder.get(Number(a.vinculado || 0)) ?? 0) - (selectedOrder.get(Number(b.vinculado || 0)) ?? 0)
      }
      if (aSelected) return -1
      if (bSelected) return 1
      return 0
    })
  }, [data?.bulk, positiveFilteredSummaries, positiveDisplayedSummaries, selectedVinculados])

  const displayedWithPhoneCount = displayedSource.filter(x => x.isValidForDispatch).length
  const displayedWithoutPhoneCount = displayedSource.length - displayedWithPhoneCount

  return (
    <>
      {/* <div className='mb-4'>
        <div className='rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex-1'>
              <div className='text-sm text-slate-500'>Resultados (consulta Detallado)</div>
              <div className='text-2xl font-semibold mt-1'>{displayedSource.length}</div>
            </div>
            <div className='flex items-center gap-3'>
              <input
                type='text'
                placeholder='Buscar por cédula'
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className='rounded-md border px-3 py-2'
              />
              <button className='rounded-md bg-blue-600 px-4 py-2 text-white' onClick={() => {
                if (!documento) {
                  // recargar todo
                  (async () => {
                    try {
                      setLoadingDetallado(true)
                      const empresaParam = companyFilter === 'servired' ? '101' : companyFilter === 'multired' ? '102' : '0'
                      const resp = await axios.get(`${API_URL}/carteraDetalladoWsp?empresa=${empresaParam}&abs=false`)
                      setDisplayedSummaries(normalizeCartera(resp.data?.cartera || []))
                    } catch (err) {
                      console.error('Error recargando detallado', err)
                    } finally {
                      setLoadingDetallado(false)
                    }
                  })().catch(err => console.error(err))
                } else {
                  // buscar localmente por cédula
                  const match = displayedSummaries.find(s => String(s.documento) === documento || String(s.vinculado) === documento)
                  if (match) {
                    const selectedId = Number(match.vinculado)
                    if (!selectedVinculados.includes(selectedId)) setSelectedVinculados(prev => [...prev, selectedId])
                    toast.success(`Se agregó la cartera ${selectedId} a la selección`)
                  } else {
                    toast.error('No se encontró esa cédula en el detallado cargado')
                  }
                }
              }}>
                Buscar cédula
              </button>
            </div>
            <div className='text-sm text-slate-500'>
              {loadingDetallado ? 'Cargando...' : 'Última consulta automática'}
            </div>
          </div>
        </div>
      </div> */}

      <ReportHeader
        bulkActive={displayedSource.length > 0}
        totalCount={displayedSource.length}
        withPhoneCount={displayedWithPhoneCount}
        withoutPhoneCount={displayedWithoutPhoneCount}
        companyFilter={companyFilter}
        setCompanyFilter={setCompanyFilter}
        selectedVinculadosLength={selectedVinculados.length}
        filteredSummariesLength={displayedSource.length}
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
        filteredSummaries={displayedSource}
        selectedVinculadoSet={selectedVinculadoSet}
        selectedVinculados={selectedVinculados}
        toggleSelectAll={toggleSelectAll}
        toggleVinculadoSelection={toggleVinculadoSelection}
        openPhoneUpdateDialog={openPhoneUpdateDialog}
        withPhoneCount={displayedWithPhoneCount}
        withoutPhoneCount={displayedWithoutPhoneCount}
      />

      {(loadingDetallado || loading) && (
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

export type BulkSummary = {
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

export type ReportResponse = {
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
  failures?: Array<{ vinculado?: number; phone?: string; message?: string }>
  phone?: string | null
  hasContact?: boolean
}

interface Seller {
  NOMBRES: string
}

export interface BasesI {
  VINCULADO: string
  BASE: number
  RASPE: number
  EXCP2: number | null
  EXCP3: number | null
  CATEGORIA: number | null
  LOGIN: string
  OBSERVACION: string
  VERSION: string
  Seller: Seller
}

export interface BasesIUpdates {
  FECHA: string
  VINCULADO: string
  BASE_ANT: number
  BASE_NEW: number
  RASPE_ANT: number
  RASPE_NEW: number
  EXCP2_ANT: number
  EXCP2_NEW: number
  EXCP3_ANT: number
  EXCP3_NEW: number
  LOGIN: string
  OBSERVACION: string
  VERSION: string
  Seller: Seller
}

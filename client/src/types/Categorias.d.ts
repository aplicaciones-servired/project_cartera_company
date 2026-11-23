export interface CategoriaBase {
  ID: number
  NOMBRE: string
  ESTADO: number | boolean
  USUARIO_CREACION: string
  FECHA_CREACION: string
  USUARIO_MODIFICACION: string | null
  FECHA_MODIFICACION: string | null
}

export interface CreateCategoriaPayload {
  NOMBRE: string
  ESTADO: number
  USUARIO_CREACION: string
}

export interface UpdateCategoriaPayload {
  NOMBRE: string
  ESTADO: number
  USUARIO_MODIFICACION: string
}

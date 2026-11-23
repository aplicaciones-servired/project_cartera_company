import axios from 'axios'
import { API_URL } from '../utils/contanst'
import {
  CategoriaBase,
  CreateCategoriaPayload,
  UpdateCategoriaPayload
} from '../types/Categorias'

export const getCategoriaErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export const getCategorias = async (): Promise<CategoriaBase[]> => {
  const response = await axios.get<CategoriaBase[]>(`${API_URL}/categorias`)
  return response.data
}

export const createCategoria = async (payload: CreateCategoriaPayload): Promise<CategoriaBase> => {
  const response = await axios.post<CategoriaBase>(`${API_URL}/categorias`, payload)
  return response.data
}

export const updateCategoria = async (
  id: number,
  payload: UpdateCategoriaPayload
): Promise<CategoriaBase> => {
  const response = await axios.put<CategoriaBase>(`${API_URL}/categorias/${id}`, payload)
  return response.data
}

export const deleteCategoria = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/categorias/${id}`)
}

export const updateBaseCategoria = async (vinculado: string, excp2: number): Promise<void> => {
  await axios.put(`${API_URL}/bases/${encodeURIComponent(vinculado)}/categoria`, { EXCP2: excp2 })
}

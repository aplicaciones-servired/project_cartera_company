import { TableRoot, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Input, Label, Badge, Button, SelectNative } from '../components/ui'
import { formatValue } from '../utils/funtions'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useEffect, useState } from 'react'
import { API_URL } from '../utils/contanst'
import { BasesI } from '../types/Bases'
import { CategoriaBase } from '../types/Categorias'
import { getCategoriaErrorMessage, getCategorias, updateBaseCategoria, updateBaseExcepciones } from '../services/categoriasService'
import { toast } from 'sonner'
import axios from 'axios'

const formatThousands = (value: number | null | undefined): string => {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num) || num < 0) return '0'
  return new Intl.NumberFormat('es-CO').format(Math.trunc(num))
}

const parseDigits = (raw: string): number => {
  const digits = raw.replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

const BasesPage = () => {
  const [data, setData] = useState<BasesI[]>([])
  const [categorias, setCategorias] = useState<CategoriaBase[]>([])
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [updatingCells, setUpdatingCells] = useState<Record<string, boolean>>({})
  const [asc, setAsc] = useState<boolean>(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [vinculado, setVinculado] = useState<string>('')

  useEffect(() => {
    axios.get(`${API_URL}/getAllBases`)
      .then(response => setData(response.data))
      .catch(error => console.log(error))

    getCategorias()
      .then(response => setCategorias(response))
      .catch(error => toast.error(getCategoriaErrorMessage(error, 'Error al cargar las categorías')))
  }, [])

  const handleCategoriaChange = async (
    vinculadoValue: string,
    currentCategoria: number | null,
    value: string
  ) => {
    const newCategoriaId = Number(value)
    if (Number.isNaN(newCategoriaId) || newCategoriaId === Number(currentCategoria ?? 0)) {
      return
    }

    setUpdatingIds(prev => ({ ...prev, [vinculadoValue]: true }))
    try {
      await updateBaseCategoria(vinculadoValue, newCategoriaId)
      setData(prev =>
        prev.map(row =>
          row.VINCULADO === vinculadoValue ? { ...row, CATEGORIA: newCategoriaId } : row
        )
      )
      toast.success('Categoría actualizada correctamente')
    } catch (error) {
      toast.error(getCategoriaErrorMessage(error, 'Error al actualizar la categoría'))
    } finally {
      setUpdatingIds(prev => ({ ...prev, [vinculadoValue]: false }))
    }
  }

  const clearDraft = (key: string) => {
    setDraftValues(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleExcepcionBlur = async (
    vinculadoValue: string,
    field: 'EXCP2' | 'EXCP3',
    currentVal: number | null
  ) => {
    const key = `${vinculadoValue}-${field}`
    if (!(key in draftValues)) {
      return
    }

    const parsed = parseDigits(draftValues[key])
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2147483647) {
      toast.error('Ingrese un valor entero válido')
      clearDraft(key)
      return
    }

    if (parsed === Number(currentVal ?? 0)) {
      clearDraft(key)
      return
    }

    setUpdatingCells(prev => ({ ...prev, [key]: true }))
    try {
      await updateBaseExcepciones(vinculadoValue, { [field]: parsed })
      setData(prev =>
        prev.map(row =>
          row.VINCULADO === vinculadoValue ? { ...row, [field]: parsed } : row
        )
      )
      clearDraft(key)
      toast.success(
        field === 'EXCP2'
          ? 'Domingueros actualizado correctamente'
          : 'Quincenazos actualizado correctamente'
      )
    } catch (error) {
      clearDraft(key)
      toast.error(getCategoriaErrorMessage(error, 'Error al actualizar el valor'))
    } finally {
      setUpdatingCells(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleClick = (id: string) => {
    return () => navigate(`/base/${id}`)
  }

  const handleCreateBase = () => {
    return navigate('/asignarNuevaBase')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVinculado(e.target.value)
  }

  const filterVinculado = (data: BasesI[]) => {
    if (!vinculado) return data
    return data.filter(item => item.VINCULADO.toLowerCase().includes(vinculado.toLowerCase()))
  }

  const filteredData = filterVinculado(data)

  const handleSort = () => {
    const sortedData = [...filteredData].sort((a, b) => {
      if (asc) {
        return a.BASE - b.BASE
      } else {
        return b.BASE - a.BASE
      }
    })
    setAsc(!asc)
    setData(sortedData)
  }

  return (
    <section className=''>
      <section className='flex justify-around py-2 w-full'>
        <div className='flex items-center gap-2'>
          <Label>Vinculado: </Label>
          <Input type="text" placeholder="1118********" onChange={handleChange} value={vinculado} />
        </div>
        <div className='flex items-center gap-2 text-gray-600'>
          <p>N° Datos:</p>
          <Badge variant='warning'>
            {filteredData.length}
          </Badge>
        </div>
        {
          user?.sub_process === 'cartera'
            ? <Button onClick={handleCreateBase}>Asignar Nueva Base</Button>
            : <Button variant='ghost'></Button>
        }
      </section>
      <TableRoot className='h-[83vh]'>
        <Table>
          <TableHead className='sticky top-0 bg-gray-100 z-30'>
            <TableRow>
              <TableHeaderCell>#</TableHeaderCell>
              <TableHeaderCell>Nombres</TableHeaderCell>
              <TableHeaderCell>N° Cedula</TableHeaderCell>
              <TableHeaderCell onClick={handleSort} className='cursor-pointer hover:text-red-400'>
                Base Asignada ...
              </TableHeaderCell>
              <TableHeaderCell>Categorías</TableHeaderCell>
              <TableHeaderCell>Domingueros</TableHeaderCell>
              <TableHeaderCell>Quincenazos</TableHeaderCell>
              <TableHeaderCell>Opciones</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow key={item.VINCULADO}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{item.Seller.NOMBRES}</TableCell>
                <TableCell>
                  {item.VINCULADO}
                </TableCell>
                <TableCell>
                  {formatValue(item.BASE)}
                </TableCell>
                <TableCell>
                  <SelectNative
                    className='w-48'
                    disabled={Boolean(updatingIds[item.VINCULADO])}
                    value={categorias.some((cat) => cat.ID === Number(item.CATEGORIA)) ? String(item.CATEGORIA) : '0'}
                    onChange={(e) => {
                      handleCategoriaChange(item.VINCULADO, item.CATEGORIA, e.target.value).catch((err) => console.error(err))
                    }}
                  >
                    <option value='0'>Sin categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.ID} value={String(cat.ID)}>
                        {Number(cat.ESTADO) !== 0 ? cat.NOMBRE : `${cat.NOMBRE} (Inactiva)`}
                      </option>
                    ))}
                  </SelectNative>
                </TableCell>
                {(['EXCP2', 'EXCP3'] as const).map((field) => {
                  const key = `${item.VINCULADO}-${field}`
                  const savedVal = item[field]
                  const displayVal = key in draftValues ? draftValues[key] : formatThousands(savedVal)
                  return (
                    <TableCell key={field}>
                      <div className='relative w-36'>
                        <span className='pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 z-10'>
                          $
                        </span>
                        <Input
                          type='text'
                          inputMode='numeric'
                          className='w-36'
                          inputClassName='pl-6 text-right'
                          value={displayVal}
                          disabled={Boolean(updatingCells[key])}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                            const formatted = digits === '' ? '' : formatThousands(Number(digits))
                            setDraftValues(prev => ({ ...prev, [key]: formatted }))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          onBlur={() => {
                            handleExcepcionBlur(item.VINCULADO, field, savedVal).catch((err) => console.error(err))
                          }}
                        />
                      </div>
                    </TableCell>
                  )
                })}
                <TableCell>
                  {
                    user?.sub_process === 'cartera'
                      ? <Button variant='primary' onClick={handleClick(item.VINCULADO)}>Actualizar</Button>
                      : <Button variant='ghost' ></Button>
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableRoot>
    </section>
  )
}

export default BasesPage

import { TableRoot, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Input, Label, Badge, Button, SelectNative } from '../components/ui'
import { formatValue } from '../utils/funtions'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useEffect, useState } from 'react'
import { API_URL } from '../utils/contanst'
import { BasesI } from '../types/Bases'
import { CategoriaBase } from '../types/Categorias'
import { getCategoriaErrorMessage, getCategorias, updateBaseCategoria } from '../services/categoriasService'
import { toast } from 'sonner'
import axios from 'axios'

const BasesPage = () => {
  const [data, setData] = useState<BasesI[]>([])
  const [categorias, setCategorias] = useState<CategoriaBase[]>([])
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
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
    currentExcp2: number | null,
    value: string
  ) => {
    const newCategoriaId = Number(value)
    if (Number.isNaN(newCategoriaId) || newCategoriaId === Number(currentExcp2 ?? 0)) {
      return
    }

    setUpdatingIds(prev => ({ ...prev, [vinculadoValue]: true }))
    try {
      await updateBaseCategoria(vinculadoValue, newCategoriaId)
      setData(prev =>
        prev.map(row =>
          row.VINCULADO === vinculadoValue ? { ...row, EXCP2: newCategoriaId } : row
        )
      )
      toast.success('Categoría actualizada correctamente')
    } catch (error) {
      toast.error(getCategoriaErrorMessage(error, 'Error al actualizar la categoría'))
    } finally {
      setUpdatingIds(prev => ({ ...prev, [vinculadoValue]: false }))
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
                    value={categorias.some((cat) => cat.ID === Number(item.EXCP2)) ? String(item.EXCP2) : '0'}
                    onChange={(e) => {
                      handleCategoriaChange(item.VINCULADO, item.EXCP2, e.target.value).catch((err) => console.error(err))
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

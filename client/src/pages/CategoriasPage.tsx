import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthProvider'
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  SelectNative,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow
} from '../components/ui'
import {
  createCategoria,
  deleteCategoria,
  getCategoriaErrorMessage,
  getCategorias,
  updateCategoria
} from '../services/categoriasService'
import { CategoriaBase } from '../types/Categorias'

const isActive = (estado: number | boolean): boolean => Boolean(Number(estado))

const formatDateTime = (value: string | null): string => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed)
}

const CategoriasPage = () => {
  const { user } = useAuth()
  const [categorias, setCategorias] = useState<CategoriaBase[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | '1' | '0'>('all')

  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaBase | null>(null)
  const [nombre, setNombre] = useState<string>('')
  const [estado, setEstado] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)
  const [deletingCategoria, setDeletingCategoria] = useState<CategoriaBase | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCategorias()
      setCategorias(data)
    } catch (error) {
      toast.error(getCategoriaErrorMessage(error, 'Error al cargar las categorías'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategorias().catch((error) => console.error('Error cargando categorías:', error))
  }, [fetchCategorias])

  const filteredCategorias = useMemo(() => {
    const term = search.trim().toLowerCase()
    return categorias.filter((item) => {
      const matchesSearch =
        !term ||
        item.NOMBRE.toLowerCase().includes(term) ||
        item.USUARIO_CREACION.toLowerCase().includes(term) ||
        (item.USUARIO_MODIFICACION ?? '').toLowerCase().includes(term)

      const active = isActive(item.ESTADO)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === '1' && active) ||
        (statusFilter === '0' && !active)

      return matchesSearch && matchesStatus
    })
  }, [categorias, search, statusFilter])

  const handleOpenCreate = () => {
    setEditingCategoria(null)
    setNombre('')
    setEstado(true)
    setFormOpen(true)
  }

  const handleOpenEdit = (categoria: CategoriaBase) => {
    setEditingCategoria(categoria)
    setNombre(categoria.NOMBRE)
    setEstado(isActive(categoria.ESTADO))
    setFormOpen(true)
  }

  const handleOpenDelete = (categoria: CategoriaBase) => {
    setDeletingCategoria(categoria)
    setDeleteOpen(true)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()

    const trimmedNombre = nombre.trim()
    if (!trimmedNombre) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }

    const currentUsername = (user?.username || 'SISTEMA').slice(0, 50)
    const estadoNumeric = estado ? 1 : 0

    setSaving(true)
    try {
      if (editingCategoria) {
        await updateCategoria(editingCategoria.ID, {
          NOMBRE: trimmedNombre,
          ESTADO: estadoNumeric,
          USUARIO_MODIFICACION: currentUsername
        })
        toast.success('Categoría actualizada correctamente')
      } else {
        await createCategoria({
          NOMBRE: trimmedNombre,
          ESTADO: estadoNumeric,
          USUARIO_CREACION: currentUsername
        })
        toast.success('Categoría creada correctamente')
      }

      setFormOpen(false)
      setEditingCategoria(null)
      await fetchCategorias()
    } catch (error) {
      toast.error(getCategoriaErrorMessage(error, 'No fue posible guardar la categoría'))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingCategoria) return

    setDeleting(true)
    try {
      await deleteCategoria(deletingCategoria.ID)
      toast.success('Categoría eliminada correctamente')
      setDeleteOpen(false)
      setDeletingCategoria(null)
      await fetchCategorias()
    } catch (error) {
      toast.error(getCategoriaErrorMessage(error, 'No fue posible eliminar la categoría'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className='flex flex-col gap-2 px-2'>
      <Card className='flex flex-wrap items-center justify-between gap-4 py-3 px-4'>
        <div className='flex flex-wrap items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Label htmlFor='buscar-categoria' className='font-semibold whitespace-nowrap'>
              Buscar:
            </Label>
            <Input
              id='buscar-categoria'
              type='search'
              placeholder='Nombre o usuario...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='w-64'
            />
          </div>

          <div className='flex items-center gap-2'>
            <Label htmlFor='filtro-estado' className='font-semibold whitespace-nowrap'>
              Estado:
            </Label>
            <SelectNative
              id='filtro-estado'
              className='w-40'
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | '1' | '0')}
            >
              <option value='all'>Todas</option>
              <option value='1'>Activas</option>
              <option value='0'>Inactivas</option>
            </SelectNative>
          </div>

          <div className='flex items-center gap-2 text-gray-600 dark:text-gray-300'>
            <span>N° Categorías:</span>
            <Badge variant='warning'>{filteredCategorias.length}</Badge>
          </div>
        </div>

        <Button type='button' onClick={handleOpenCreate}>
          Nueva Categoría
        </Button>
      </Card>

      <Card>
        <TableRoot className='h-[78vh] overflow-y-auto'>
          <Table>
            <TableHead className='sticky top-0 bg-gray-100 dark:bg-gray-900 z-30'>
              <TableRow>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Nombre</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Usuario Creación</TableHeaderCell>
                <TableHeaderCell>Fecha Creación</TableHeaderCell>
                <TableHeaderCell>Usuario Modificación</TableHeaderCell>
                <TableHeaderCell>Fecha Modificación</TableHeaderCell>
                <TableHeaderCell className='text-right'>Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    Cargando categorías...
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredCategorias.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    No se encontraron categorías
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredCategorias.map((item) => {
                const active = isActive(item.ESTADO)
                return (
                  <TableRow key={item.ID} className='hover:bg-gray-50 dark:hover:bg-gray-900/40'>
                    <TableCell>{item.ID}</TableCell>
                    <TableCell className='font-medium text-gray-900 dark:text-gray-100'>
                      {item.NOMBRE}
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? 'success' : 'error'}>
                        {active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.USUARIO_CREACION}</TableCell>
                    <TableCell>{formatDateTime(item.FECHA_CREACION)}</TableCell>
                    <TableCell>{item.USUARIO_MODIFICACION || '-'}</TableCell>
                    <TableCell>{formatDateTime(item.FECHA_MODIFICACION)}</TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-2'>
                        <Button
                          type='button'
                          variant='secondary'
                          onClick={() => handleOpenEdit(item)}
                        >
                          Editar
                        </Button>
                        <Button
                          type='button'
                          variant='destructive'
                          onClick={() => handleOpenDelete(item)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableRoot>
      </Card>

      <Dialog open={formOpen} onOpenChange={(open) => !saving && setFormOpen(open)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription>
              {editingCategoria
                ? 'Actualiza el nombre o estado de la categoría seleccionada.'
                : 'Ingresa los datos para registrar una nueva categoría.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className='flex flex-col gap-4 pt-3'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='categoria-nombre'>Nombre</Label>
              <Input
                id='categoria-nombre'
                type='text'
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={100}
                placeholder='Nombre de la categoría'
                required
              />
            </div>

            <div className='flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2'>
              <div className='flex flex-col'>
                <Label htmlFor='categoria-estado'>Estado</Label>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {estado ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <Switch
                id='categoria-estado'
                checked={estado}
                onCheckedChange={setEstado}
              />
            </div>

            <DialogFooter className='mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end'>
              <DialogClose asChild>
                <Button type='button' variant='secondary' disabled={saving}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type='submit' isLoading={saving} loadingText='Guardando...'>
                {editingCategoria ? 'Guardar cambios' : 'Crear categoría'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Eliminar Categoría</DialogTitle>
            <DialogDescription>
              {`¿Está seguro de eliminar la categoría "${deletingCategoria?.NOMBRE ?? ''}" (ID: ${deletingCategoria?.ID ?? ''})? Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className='mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end'>
            <DialogClose asChild>
              <Button type='button' variant='secondary' disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type='button'
              variant='destructive'
              isLoading={deleting}
              loadingText='Eliminando...'
              onClick={handleConfirmDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export default CategoriasPage

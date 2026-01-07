'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ApplicantCard, { Applicant } from './components/ApplicantCard'
import FiltersSection from './components/FiltersSection'
import Pagination from './components/Pagination'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from './components/icons'

export default function AspirantesPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Estados de filtros
  const [filters, setFilters] = useState({
    nombre: '',
    contacto: '',
    especialidad: '',
    fecha_graduado_desde: '',
    fecha_graduado_hasta: '',
    fecha_desde: '',
    fecha_hasta: '',
    estado: ''
  })

  // Cargar aspirantes cuando cambien filtros o página
  useEffect(() => {
    // Debounce para filtros de texto (excepto cambio de página)
    const timer = setTimeout(() => {
      fetchApplicants()
    }, 1000)

    return () => clearTimeout(timer)
  }, [currentPage, filters])

  const fetchApplicants = async () => {
    try {
      setLoading(true)
      
      // Construir URL con parámetros
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50'
      })
      
      // Agregar filtros si existen
      if (filters.nombre) params.append('nombre', filters.nombre)
      if (filters.contacto) params.append('contacto', filters.contacto)
      if (filters.especialidad) params.append('especialidad', filters.especialidad)
      if (filters.fecha_graduado_desde) params.append('fecha_graduado_desde', filters.fecha_graduado_desde)
      if (filters.fecha_graduado_hasta) params.append('fecha_graduado_hasta', filters.fecha_graduado_hasta)
      if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde)
      if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta)
      if (filters.estado) params.append('estado', filters.estado)
      
      const response = await fetch(`/api/applicants?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar aspirantes')
      
      const result = await response.json()
      setApplicants(result.data)
      setTotalPages(result.pagination.totalPages)
      setTotalRecords(result.pagination.total)
    } catch (error) {
      console.error('Error fetching applicants:', error)
      setMessage({ type: 'error', text: 'Error al cargar aspirantes' })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setCurrentPage(1) // Resetear a página 1 cuando cambian filtros
  }

  const clearFilters = () => {
    setFilters({
      nombre: '',
      contacto: '',
      especialidad: '',
      fecha_graduado_desde: '',
      fecha_graduado_hasta: '',
      fecha_desde: '',
      fecha_hasta: '',
      estado: ''
    })
    setCurrentPage(1) // Resetear a página 1 cuando se limpian filtros
  }

  const updateApplicant = async (id: string, estado: string, observacion: string) => {
    try {
      setUpdating(id)
      const response = await fetch(`/api/applicants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, observacion })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      const updated = await response.json()
      
      // Actualizar en el estado local
      setApplicants(prev => 
        prev.map(a => a.id === id ? updated : a)
      )

      setMessage({ type: 'success', text: 'Aspirante actualizado correctamente' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error updating applicant:', error)
      setMessage({ type: 'error', text: 'Error al actualizar aspirante' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando aspirantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mb-4"
          >
            <ArrowLeftIcon />
            <span>Volver al menú</span>
          </Link>
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
            Gestión de Aspirantes
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Total de aspirantes: {totalRecords}
          </p>
        </div>

        {/* Mensajes */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircleIcon /> : <XCircleIcon />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Filtros */}
        <FiltersSection
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
        />

        {/* Lista de Aspirantes */}
        {applicants.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">No se encontraron aspirantes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {applicants.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                updating={updating === applicant.id}
                onUpdate={updateApplicant}
              />
            ))}
          </div>
        )}

        {/* Paginación */}
        {applicants.length > 0 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
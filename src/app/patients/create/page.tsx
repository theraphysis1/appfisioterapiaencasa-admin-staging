'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Therapist {
  id: string
  nombre: string
  apellido: string
  cedula: string
  email: string
  contacto: string
  placa_moto: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export default function SelectTherapistPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const router = useRouter()
  const [isPackageMode, setIsPackageMode] = useState(false)
  const [confirmTherapistId, setConfirmTherapistId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si estamos en modo paquete
    const packageMode = sessionStorage.getItem('isSchedulingPackage') === 'true'
    setIsPackageMode(packageMode)
    
    // Si venimos desde confirmación, guardar el therapistId
    if (packageMode) {
      const therapistId = sessionStorage.getItem('packageConfirmTherapistId')
      setConfirmTherapistId(therapistId)
    }
    
    fetchTherapists()
  }, [])

  const fetchTherapists = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/therapists')
      
      if (!response.ok) {
        throw new Error('Error al cargar los terapeutas')
      }

      const data = await response.json()
      setTherapists(data.therapists || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando terapeutas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchTherapists}
            className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href={isPackageMode && confirmTherapistId ? `/patients/schedule/${confirmTherapistId}/confirm` : '/home'}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
            onClick={(e) => {
              if (isPackageMode) {
                e.preventDefault()
                // Limpiar flags temporales pero mantener datos del paquete
                sessionStorage.removeItem('isSchedulingPackage')
                sessionStorage.removeItem('selectedPackageTherapist')
                // No remover packageConfirmTherapistId aquí, se limpia en confirm
                
                // Navegar a confirmación usando el therapistId guardado
                if (confirmTherapistId) {
                  router.push(`/patients/schedule/${confirmTherapistId}/confirm`)
                } else {
                  router.push('/home')
                }
              }
            }}
          >
            ← {isPackageMode ? 'Volver a confirmación de paquete' : 'Volver al inicio'}
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isPackageMode ? 'Seleccionar Terapeuta para Cita de Paquete' : 'Seleccionar Terapeuta'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {isPackageMode ? 'Elige el terapeuta para la siguiente cita del paquete' : 'Elige un terapeuta para agendar un paciente'}
          </p>
        </div>

        {therapists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No hay terapeutas registrados
            </p>
            <Link
              href="/therapists/create"
              className="inline-flex rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              Crear Terapeuta
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                onClick={() => {
                  if (isPackageMode) {
                    // Guardar terapeuta seleccionado para el paquete
                    sessionStorage.setItem('selectedPackageTherapist', JSON.stringify({
                      id: therapist.id,
                      nombre: therapist.nombre,
                      apellido: therapist.apellido
                    }))
                  }
                  router.push(`/patients/schedule/${therapist.id}`)
                }}
                className="block bg-white dark:bg-zinc-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border-2 border-transparent hover:border-purple-500 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold text-xl">
                      {getInitials(therapist.nombre, therapist.apellido)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                      {therapist.nombre} {therapist.apellido}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        <span className="font-medium">Contacto:</span> {therapist.contacto}
                      </p>
                      {therapist.placa_moto && (
                        <p className="text-zinc-600 dark:text-zinc-400">
                          <span className="font-medium">Placa:</span> {therapist.placa_moto}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
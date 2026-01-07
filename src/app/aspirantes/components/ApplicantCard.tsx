'use client'

import { useState } from 'react'

export interface Applicant {
  id: string
  nombre: string
  contacto: string
  cedula: string | null
  direccion: string
  barrio: string | null
  especialidad: string
  fecha_graduado: string
  fecha_enviada_hv: string
  estado: string
  observacion: string | null
  created_at: string
  updated_at: string
}

interface ApplicantCardProps {
  applicant: Applicant
  updating: boolean
  onUpdate: (id: string, estado: string, observacion: string) => void
}

export default function ApplicantCard({ applicant, updating, onUpdate }: ApplicantCardProps) {
  const [estado, setEstado] = useState(applicant.estado)
  const [observacion, setObservacion] = useState(applicant.observacion || '')
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    onUpdate(applicant.id, estado, observacion)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEstado(applicant.estado)
    setObservacion(applicant.observacion || '')
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    // Usar la fecha directamente sin conversión de zona horaria
    const [year, month, day] = dateString.split('-')
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    const monthName = months[parseInt(month) - 1]
    return `${day} ${monthName} ${year}`
  }

  const getEstadoBadgeColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      case 'contactado': return 'bg-blue-100 text-blue-800'
      case 'rechazado': return 'bg-red-100 text-red-800'
      case 'activo': return 'bg-green-100 text-green-800'
      case 'retirado': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header con nombre y badge de estado */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
          {applicant.nombre}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeColor(applicant.estado)}`}>
          {applicant.estado.toUpperCase()}
        </span>
      </div>

      {/* Información del aspirante */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Contacto:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-100">{applicant.contacto}</span>
        </div>
        
        {applicant.cedula && (
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Cédula:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-100">{applicant.cedula}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Dirección:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-100 text-right">{applicant.direccion}</span>
        </div>
        
        {applicant.barrio && (
          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Barrio:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-100">{applicant.barrio}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Especialidad:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-100">{applicant.especialidad}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">Fecha Graduado:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-100">{formatDate(applicant.fecha_graduado)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-600 dark:text-zinc-400">HV Enviada:</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-100">{formatDate(applicant.fecha_enviada_hv)}</span>
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
        {/* Estado editable */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value)
              setIsEditing(true)
            }}
            disabled={updating}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          >
            <option value="pendiente">Pendiente</option>
            <option value="contactado">Contactado</option>
            <option value="rechazado">Rechazado</option>
            <option value="activo">Activo</option>
            <option value="retirado">Retirado</option>
          </select>
        </div>

        {/* Observación editable */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Observación
          </label>
          <textarea
            value={observacion}
            onChange={(e) => {
              setObservacion(e.target.value)
              setIsEditing(true)
            }}
            disabled={updating}
            rows={3}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50 resize-none"
            placeholder="Agregar observaciones..."
          />
        </div>

        {/* Botones de acción */}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {updating ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={handleCancel}
              disabled={updating}
              className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
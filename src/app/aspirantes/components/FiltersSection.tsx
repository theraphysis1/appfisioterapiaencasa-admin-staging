'use client'

import { SearchIcon } from './icons'

interface FiltersSectionProps {
  filters: {
    nombre: string
    contacto: string
    cedula: string
    direccion: string
    especialidad: string
    fecha_graduado: string
    fecha_desde: string
    fecha_hasta: string
    estado: string
  }
  onFilterChange: (field: string, value: string) => void
  onClearFilters: () => void
}

export default function FiltersSection({ filters, onFilterChange, onClearFilters }: FiltersSectionProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <SearchIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Filtros de Búsqueda</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={filters.nombre}
            onChange={(e) => onFilterChange('nombre', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            placeholder="Buscar por nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Contacto
          </label>
          <input
            type="text"
            value={filters.contacto}
            onChange={(e) => onFilterChange('contacto', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            placeholder="Buscar por contacto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Cédula
          </label>
          <input
            type="text"
            value={filters.cedula}
            onChange={(e) => onFilterChange('cedula', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            placeholder="Buscar por cédula"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={filters.direccion}
            onChange={(e) => onFilterChange('direccion', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            placeholder="Buscar por dirección"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Especialidad
          </label>
          <input
            type="text"
            value={filters.especialidad}
            onChange={(e) => onFilterChange('especialidad', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
            placeholder="Buscar por especialidad"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Fecha Graduado
          </label>
          <input
            type="date"
            value={filters.fecha_graduado}
            onChange={(e) => onFilterChange('fecha_graduado', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Fecha HV Desde
          </label>
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => onFilterChange('fecha_desde', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Fecha HV Hasta
          </label>
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => onFilterChange('fecha_hasta', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Estado
          </label>
          <select
            value={filters.estado}
            onChange={(e) => onFilterChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="contactado">Contactado</option>
            <option value="rechazado">Rechazado</option>
            <option value="activo">Activo</option>
            <option value="retirado">Retirado</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}
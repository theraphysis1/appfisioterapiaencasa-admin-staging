import { FiltroTipo } from '../hooks/useContinuationAlerts'

interface FiltersSectionProps {
  filtroTipo: FiltroTipo
  total: number
  onFiltroChange: (tipo: FiltroTipo) => void
}

const filtros: { value: FiltroTipo; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'valoracion_completada', label: '🩺 Valoraciones' },
  { value: 'paquete_completado', label: '📦 Paquetes' }
]

export default function FiltersSection({
  filtroTipo,
  total,
  onFiltroChange
}: FiltersSectionProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
        Filtrar:
      </span>
      {filtros.map(filtro => (
        <button
          key={filtro.value}
          onClick={() => onFiltroChange(filtro.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filtroTipo === filtro.value
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700'
          }`}
        >
          {filtro.label}
        </button>
      ))}
      <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400">
        {total} alerta{total !== 1 ? 's' : ''} pendiente{total !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
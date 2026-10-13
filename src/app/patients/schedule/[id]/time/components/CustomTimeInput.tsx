// src/app/patients/schedule/[id]/time/components/CustomTimeInput.tsx
'use client'

interface CustomTimeInputProps {
  isOpen: boolean
  value: string
  error: string | null
  onOpen: () => void
  onClose: () => void
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function CustomTimeInput({
  isOpen,
  value,
  error,
  onOpen,
  onClose,
  onChange,
  onSubmit
}: CustomTimeInputProps) {
  if (!isOpen) {
    return (
      <div className="mt-6 max-w-md mx-auto">
        <button
          type="button"
          onClick={onOpen}
          className="w-full py-3 px-4 rounded-lg border-2 border-dashed border-zinc-400 dark:border-zinc-500 text-zinc-700 dark:text-zinc-300 font-medium hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
        >
          🕐 Otro horario
        </button>
      </div>
    )
  }

  return (
    <form
      className="mt-6 max-w-md mx-auto p-4 rounded-lg border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        Escribe la hora (ej: 4:45 PM)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="4:45 PM"
        autoFocus
        className="w-full py-3 px-4 rounded-lg border-2 border-purple-500 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 text-center font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-4 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 py-2 px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </form>
  )
}
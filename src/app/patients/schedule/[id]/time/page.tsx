'use client'

import Link from 'next/link'
import { useTimeSlots } from './hooks/useTimeSlots'
import TimeGrid from './components/TimeGrid'
import CustomTimeInput from './components/CustomTimeInput'
import { formatTime } from './utils/timeSlots'

export default function SelectTimePage() {
  const {
    therapistId,
    therapist,
    loading,
    selectedDate,
    isPackageMode,
    packageData,
    isEditMode,
    editingSlot,
    editedTime,
    appointments,
    selectedAppointment,
    showAppointmentModal,
    gridRows,
    getSlot,
    otherSlots,
    formatDate,
    getDireccionIcon,
    getDireccionTooltip,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTimeInputChange,
    handleTimeInputBlur,
    handleTimeInputKeyDown,
    handleOccupiedSlotClick,
    closeModal,
    handleTimeSelect,
    goToEditAppointment,
    showCustomTime,
    customTime,
    customTimeError,
    openCustomTime,
    closeCustomTime,
    handleCustomTimeChange,
    handleCustomTimeSubmit
  } = useTimeSlots()

  if (loading || !selectedDate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

    if (!therapist) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/patients/schedule/${therapistId}`}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-4"
          >
            ← Volver al calendario
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            {isEditMode ? 'Seleccionar Nuevo Horario para Cita' : isPackageMode ? 'Seleccionar Horario para Cita de Paquete' : 'Seleccionar Horario'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Terapeuta: <span className="font-semibold">{therapist.nombre} {therapist.apellido}</span>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Fecha: <span className="font-semibold">{formatDate(selectedDate)}</span>
          </p>
          {isEditMode && (
            <div className="mt-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                📝 Editando cita - Selecciona un nuevo horario
              </p>
            </div>
          )}
          {isPackageMode && packageData && !isEditMode && (
            <p className="text-purple-600 dark:text-purple-400 mt-1 font-medium">
              📦 {packageData.service.nombre} - {packageData.patient.nombre} {packageData.patient.apellido}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-6">
          {/* Mini-lista de citas del día */}
          {appointments.filter(apt => apt.estado !== 'cancelada').length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                📅 Citas agendadas hoy ({appointments.filter(apt => apt.estado !== 'cancelada').length})
              </h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {appointments
                  .filter(apt => apt.estado !== 'cancelada')
                  .map(apt => {
                    const aptDate = new Date(apt.fecha_hora)
                    const hours = aptDate.getHours()
                    const minutes = aptDate.getMinutes()
                    const timeStr = formatTime(hours, minutes)
                    
                    return (
                      <div key={apt.id} className="text-sm text-blue-800 dark:text-blue-200 py-1.5 border-b border-blue-200 dark:border-blue-800 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base">{timeStr}</span>
                          <span className="font-semibold">{apt.patient.nombre} {apt.patient.apellido}</span>
                          {apt.tiene_direccion_temporal && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                              Temporal
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
                          <span className="inline-flex items-center gap-1" title={getDireccionTooltip(apt.tiene_direccion_temporal)}>
                            {getDireccionIcon(apt.tiene_direccion_temporal)} <span className="text-blue-600 dark:text-blue-400 font-medium">{apt.barrio_final}</span>
                          </span>
                          <span>•</span>
                          <span className="text-blue-700 dark:text-blue-300">{apt.service.nombre}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Horarios Disponibles
          </h2>
          
            <TimeGrid
            rows={gridRows}
            getSlot={getSlot}
            otherSlots={otherSlots}
            editingSlot={editingSlot}
            editedTime={editedTime}
            onSelect={handleTimeSelect}
            onOccupiedClick={handleOccupiedSlotClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTimeInputChange={handleTimeInputChange}
            onTimeInputBlur={handleTimeInputBlur}
            onTimeInputKeyDown={handleTimeInputKeyDown}
          />
            <CustomTimeInput
            isOpen={showCustomTime}
            value={customTime}
            error={customTimeError}
            onOpen={openCustomTime}
            onClose={closeCustomTime}
            onChange={handleCustomTimeChange}
            onSubmit={handleCustomTimeSubmit}
          />
        </div>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Selecciona un horario para continuar con el registro del paciente</p>
        </div>
      </div>

      {/* Modal de información de cita ocupada */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                📋 Cita Ocupada
              </h3>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-purple-600 dark:text-purple-400">
                🕐 {formatTime(new Date(selectedAppointment.fecha_hora).getHours(), new Date(selectedAppointment.fecha_hora).getMinutes())}
              </div>
              
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-2">
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Paciente:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patient.nombre} {selectedAppointment.patient.apellido}
                  </p>
                </div>
                
                {/* Indicador de tipo de dirección */}
                <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-2 border border-zinc-200 dark:border-zinc-600">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg" title={getDireccionTooltip(selectedAppointment.tiene_direccion_temporal)}>
                      {getDireccionIcon(selectedAppointment.tiene_direccion_temporal)}
                    </span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {selectedAppointment.tiene_direccion_temporal ? 'Dirección temporal' : 'Dirección del domicilio'}
                    </span>
                    {selectedAppointment.tiene_direccion_temporal && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                        Temporal
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Barrio:</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                      {selectedAppointment.barrio_final}
                    </p>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Dirección:</span>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50 text-sm">
                      {selectedAppointment.direccion_final}
                    </p>
                  </div>
                  {selectedAppointment.referencia_final && (
                    <div className="mt-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Referencia:</span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                        {selectedAppointment.referencia_final}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Teléfono:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patient.telefono}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Servicio:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.service.nombre}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Patología:</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedAppointment.patologia}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    selectedAppointment.estado === 'agendada' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    selectedAppointment.estado === 'completada' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {selectedAppointment.estado}
                  </span>
                </div>
                
                {selectedAppointment.observacion && (
                  <div>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">Observación:</span>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {selectedAppointment.observacion}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => goToEditAppointment(selectedAppointment.id)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                ✏️ Editar cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { create } from 'zustand'

export interface LeaveGuard {
  title: string
  /** Qué se pierde al salir (depende del modo). */
  message: string
}

/**
 * Lo que la página actual perdería si se sale al menú; `null` = salir directo.
 * Lo registra cada página con `useConfirmLeave`.
 */
export const useLeaveGuard = create<{
  guard: LeaveGuard | null
  /** Confirmación de salida abierta (`LeaveConfirmModal`). */
  confirming: boolean
}>(() => ({
  guard: null,
  confirming: false,
}))

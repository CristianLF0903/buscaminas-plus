import { useEffect } from 'react'
import { useLeaveGuard } from '@/store/useLeaveGuard'

const TITLE = '¿Salir al menú?'

/**
 * Mientras `message` no sea null, salir al menú desde el header pide
 * confirmación con ese texto. Se limpia al desmontar la página.
 */
export function useConfirmLeave(message: string | null) {
  useEffect(() => {
    useLeaveGuard.setState({
      guard: message ? { title: TITLE, message } : null,
    })
    return () => useLeaveGuard.setState({ guard: null })
  }, [message])
}

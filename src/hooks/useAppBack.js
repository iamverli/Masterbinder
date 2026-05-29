/**
 * useAppBack — intercepts the browser/OS back gesture and navigates
 * to the logical parent route instead of the browser history stack.
 *
 * Usage: call at the top of any screen that has a logical "back" destination.
 *   useAppBack('/')   // back goes to Home
 *
 * How it works:
 *  1. On mount: push a dummy history entry so there's always something to pop.
 *  2. Listen for popstate (fired by back gesture / Android back button / iOS swipe).
 *  3. On popstate: navigate to parentRoute and push another dummy entry so the
 *     next back gesture is also intercepted.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useAppBack(parentRoute = '/') {
  const navigate = useNavigate()

  useEffect(() => {
    // Push a dummy entry so back gesture has something to pop
    window.history.pushState({ appBack: true }, '')

    function handlePopState(e) {
      // Navigate to our logical parent
      navigate(parentRoute, { replace: true })
      // Push another dummy entry so the next back gesture is also caught
      window.history.pushState({ appBack: true }, '')
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [parentRoute, navigate])
}

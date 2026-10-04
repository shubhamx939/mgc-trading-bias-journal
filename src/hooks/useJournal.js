import { useEffect, useReducer, useState } from 'react'
import { journalReducer, loadJournal, STORAGE_KEY } from '../lib/journal'

export function useJournal() {
  const [journal, dispatch] = useReducer(journalReducer, undefined, loadJournal)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    let failed = false
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(journal))
    } catch {
      failed = true
    }
    // Report the result after the storage effect, without a synchronous render cascade.
    let active = true
    queueMicrotask(() => { if (active) setSaveError(failed) })
    return () => { active = false }
  }, [journal])

  return { journal, dispatch, saveError }
}

import { useCallback, useReducer, useRef } from 'react'

export function useDirty(value: string) {
  const original = useRef(value)
  const [, forceRender] = useReducer((version: number) => version + 1, 0)
  const dirty = value !== original.current

  const markClean = useCallback((newValue: string) => {
    original.current = newValue
    forceRender()
  }, [])

  return { dirty, markClean }
}

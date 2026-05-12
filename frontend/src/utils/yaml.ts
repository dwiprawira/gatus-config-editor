/**
 * Client-side YAML utilities.
 *
 * Uses the backend for real validation. This file provides only lightweight
 * helpers for the frontend (pretty-printing diffs, etc.).
 */

/** Strip undefined/null values from a nested object for clean YAML output. */
export function cleanForYaml(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(cleanForYaml).filter((v) => v !== undefined && v !== null)
  }
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleaned = cleanForYaml(v)
      if (cleaned !== undefined && cleaned !== null && cleaned !== '') {
        out[k] = cleaned
      }
    }
    return Object.keys(out).length ? out : undefined
  }
  return obj
}

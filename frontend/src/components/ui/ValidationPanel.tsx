import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ValidationResult } from '../../api/types'

export function ValidationPanel({ result }: { result: ValidationResult | null }) {
  if (!result) return null

  return (
    <div className="rounded-md border p-4 space-y-2">
      {result.valid ? (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Config is valid</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{result.errors.length} error(s) found</span>
        </div>
      )}

      {result.errors.map((e, i) => (
        <div key={i} className="flex gap-2 text-sm text-red-700 bg-red-50 rounded px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {e.field && <span className="font-mono font-medium">{e.field}: </span>}
            {e.message}
          </div>
        </div>
      ))}

      {result.warnings.map((w, i) => (
        <div key={i} className="flex gap-2 text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {w.field && <span className="font-mono font-medium">{w.field}: </span>}
            {w.message}
          </div>
        </div>
      ))}

      {!result.native_validation_available && (
        <p className="text-xs text-gray-400 mt-2">{result.native_validation_note}</p>
      )}
    </div>
  )
}

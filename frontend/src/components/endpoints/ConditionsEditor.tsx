import { Plus, Trash2 } from 'lucide-react'

const EXAMPLES = [
  '[STATUS] == 200',
  '[STATUS] < 300',
  '[RESPONSE_TIME] < 500',
  '[BODY].status == healthy',
  '[CERTIFICATE_EXPIRATION] > 48h',
  '[DOMAIN_EXPIRATION] > 720h',
  '[CONNECTED] == true',
  '[DNS_RCODE] == NOERROR',
]

interface Props {
  value: string[]
  onChange: (v: string[]) => void
}

export function ConditionsEditor({ value, onChange }: Props) {
  const add = () => onChange([...value, ''])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, v: string) => onChange(value.map((c, idx) => (idx === i ? v : c)))
  const addExample = (ex: string) => onChange([...value, ex])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Conditions</label>
        <button className="btn-secondary text-xs" type="button" onClick={add}>
          <Plus className="h-3 w-3" /> Add Condition
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-gray-400 italic">No conditions — endpoint will always be considered healthy.</p>
      )}

      <div className="space-y-2">
        {value.map((cond, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="input flex-1 font-mono text-sm"
              value={cond}
              onChange={(e) => update(i, e.target.value)}
              placeholder="[STATUS] == 200"
            />
            <button className="text-red-400 hover:text-red-600" type="button" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-700">Common condition examples</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="px-2 py-1 bg-gray-100 rounded font-mono text-xs hover:bg-gray-200"
              onClick={() => addExample(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-1 text-gray-500">
          <p>Placeholders: [STATUS], [BODY], [RESPONSE_TIME], [CERTIFICATE_EXPIRATION], [DOMAIN_EXPIRATION], [CONNECTED], [IP], [DNS_RCODE]</p>
          <p>Functions: len(), has(), pat(), any()</p>
        </div>
      </details>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import type { Alert } from '../../types/gatus'

interface Props {
  value: Alert[]
  onChange: (v: Alert[]) => void
  configuredProviders: string[]
}

export function AlertsEditor({ value, onChange, configuredProviders }: Props) {
  const defaultType = configuredProviders[0] ?? ''

  const add = () => {
    if (!defaultType) return
    onChange([
      ...value,
      { type: defaultType, 'failure-threshold': 3, 'success-threshold': 1, 'send-on-resolved': true },
    ])
  }

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<Alert>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))

  if (configuredProviders.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-gray-400">
        No alerting providers configured. Add providers in{' '}
        <span className="font-medium">Configuration → Alerting</span> first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label mb-0">Alerts</label>
        <button className="btn-secondary text-xs" type="button" onClick={add}>
          <Plus className="h-3 w-3" /> Add Alert
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-gray-400 italic">No alerts configured for this endpoint.</p>
      )}

      <div className="space-y-3">
        {value.map((alert, i) => (
          <div key={i} className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Alert {i + 1}</span>
              <button className="text-red-400 hover:text-red-600" type="button" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Provider</label>
                <select
                  className="input text-sm"
                  value={alert.type}
                  onChange={(e) => update(i, { type: e.target.value })}
                >
                  {configuredProviders.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                  {/* Keep existing type even if provider was removed from alerting config */}
                  {!configuredProviders.includes(alert.type) && alert.type && (
                    <option value={alert.type}>{alert.type} (removed)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="label text-xs">Description</label>
                <input
                  className="input text-sm"
                  value={alert.description ?? ''}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Optional message"
                />
              </div>
              <div>
                <label className="label text-xs">Failure Threshold</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={alert['failure-threshold'] ?? ''}
                  onChange={(e) => update(i, { 'failure-threshold': parseInt(e.target.value) || undefined })}
                />
              </div>
              <div>
                <label className="label text-xs">Success Threshold</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={alert['success-threshold'] ?? ''}
                  onChange={(e) => update(i, { 'success-threshold': parseInt(e.target.value) || undefined })}
                />
              </div>
              <div>
                <label className="label text-xs">Reminder Interval</label>
                <input
                  className="input text-sm"
                  placeholder="30m"
                  value={alert['minimum-reminder-interval'] ?? ''}
                  onChange={(e) => update(i, { 'minimum-reminder-interval': e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={alert['send-on-resolved'] ?? true}
                    onChange={(e) => update(i, { 'send-on-resolved': e.target.checked })}
                  />
                  Send on resolved
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

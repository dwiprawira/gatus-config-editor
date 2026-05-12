import type { StorageConfig } from '../../types/gatus'

interface Props {
  value: StorageConfig
  onChange: (v: StorageConfig) => void
}

export function StorageForm({ value, onChange }: Props) {
  const set = (patch: Partial<StorageConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-4">
      <h2 className="section-title">Storage</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={value.type ?? 'memory'}
            onChange={(e) => set({ type: e.target.value as StorageConfig['type'] })}
          >
            <option value="memory">memory (in-memory, no persistence)</option>
            <option value="sqlite">sqlite (file-based)</option>
            <option value="postgres">postgres (PostgreSQL)</option>
          </select>
        </div>
        <div>
          <label className="label">Path / Connection String</label>
          <input
            className="input"
            placeholder="data.db or postgres://user:pass@host/db"
            value={value.path ?? ''}
            onChange={(e) => set({ path: e.target.value })}
            disabled={value.type === 'memory'}
          />
        </div>
        <div>
          <label className="label">Max Results per Endpoint</label>
          <input
            type="number"
            className="input"
            value={value['maximum-number-of-results'] ?? ''}
            onChange={(e) => set({ 'maximum-number-of-results': parseInt(e.target.value) || undefined })}
          />
        </div>
        <div>
          <label className="label">Max Events per Endpoint</label>
          <input
            type="number"
            className="input"
            value={value['maximum-number-of-events'] ?? ''}
            onChange={(e) => set({ 'maximum-number-of-events': parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="caching"
          checked={value.caching ?? false}
          onChange={(e) => set({ caching: e.target.checked })}
        />
        <label htmlFor="caching" className="text-sm text-gray-700">Enable write-through caching</label>
      </div>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import type { Announcement } from '../../types/gatus'

interface Props {
  value: Announcement[]
  onChange: (v: Announcement[]) => void
}

const TYPES = ['none', 'outage', 'warning', 'information', 'operational'] as const

export function AnnouncementsForm({ value, onChange }: Props) {
  const add = () =>
    onChange([
      ...value,
      { message: '', type: 'information', timestamp: new Date().toISOString() },
    ])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, patch: Partial<Announcement>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Announcements</h2>
        <button className="btn-secondary text-sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add Announcement
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8 border border-dashed rounded-md">
          No announcements. Add one to display a banner on the status page.
        </p>
      )}

      <div className="space-y-4">
        {value.map((ann, i) => (
          <div key={i} className="border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Announcement {i + 1}</span>
              <button className="text-red-400 hover:text-red-600" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select
                  className="input"
                  value={ann.type ?? 'none'}
                  onChange={(e) => update(i, { type: e.target.value as Announcement['type'] })}
                >
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Timestamp</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={ann.timestamp ? ann.timestamp.slice(0, 16) : ''}
                  onChange={(e) => update(i, { timestamp: new Date(e.target.value).toISOString() })}
                />
              </div>
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input"
                rows={2}
                value={ann.message}
                onChange={(e) => update(i, { message: e.target.value })}
                placeholder="Announcement text shown on the status page"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`ann-archived-${i}`}
                checked={ann.archived ?? false}
                onChange={(e) => update(i, { archived: e.target.checked })}
              />
              <label htmlFor={`ann-archived-${i}`} className="text-sm text-gray-700">Archived (show in history)</label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

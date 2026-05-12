import type { MaintenanceWindow } from '../../types/gatus'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Props {
  value: MaintenanceWindow
  onChange: (v: MaintenanceWindow) => void
  title?: string
}

export function MaintenanceForm({ value, onChange, title = 'Global Maintenance Window' }: Props) {
  const set = (patch: Partial<MaintenanceWindow>) => onChange({ ...value, ...patch })
  const every = value.every ?? []

  const toggleDay = (day: string) => {
    const next = every.includes(day) ? every.filter((d) => d !== day) : [...every, day]
    set({ every: next })
  }

  return (
    <div className="space-y-4">
      <h2 className="section-title">{title}</h2>
      <p className="text-sm text-gray-500">During maintenance windows, no alerts will be sent.</p>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="maint-enabled" checked={value.enabled ?? false} onChange={(e) => set({ enabled: e.target.checked })} />
        <label htmlFor="maint-enabled" className="text-sm text-gray-700">Enable maintenance window</label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Start Time (HH:MM)</label>
          <input className="input" placeholder="23:00" value={value.start ?? ''} onChange={(e) => set({ start: e.target.value })} />
        </div>
        <div>
          <label className="label">Duration</label>
          <input className="input" placeholder="4h" value={value.duration ?? ''} onChange={(e) => set({ duration: e.target.value })} />
        </div>
        <div>
          <label className="label">Timezone</label>
          <input className="input" placeholder="UTC" value={value.timezone ?? ''} onChange={(e) => set({ timezone: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="label">Repeat on (leave empty for daily)</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day}
              type="button"
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                every.includes(day)
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
              }`}
              onClick={() => toggleDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

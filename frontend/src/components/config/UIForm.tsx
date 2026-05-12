import { Plus, Trash2 } from 'lucide-react'
import type { UIConfig, UIButton } from '../../types/gatus'

interface Props {
  value: UIConfig
  onChange: (v: UIConfig) => void
}

export function UIForm({ value, onChange }: Props) {
  const set = (patch: Partial<UIConfig>) => onChange({ ...value, ...patch })
  const buttons = value.buttons ?? []

  const addButton = () => set({ buttons: [...buttons, { name: '', link: '' }] })
  const removeButton = (i: number) => set({ buttons: buttons.filter((_, idx) => idx !== i) })
  const updateButton = (i: number, patch: Partial<UIButton>) =>
    set({ buttons: buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) })

  return (
    <div className="space-y-4">
      <h2 className="section-title">Dashboard UI</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Page Title</label>
          <input className="input" value={value.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="Health Dashboard | Gatus" />
        </div>
        <div>
          <label className="label">Header Text</label>
          <input className="input" value={value.header ?? ''} onChange={(e) => set({ header: e.target.value })} placeholder="Status" />
        </div>
        <div>
          <label className="label">Meta Description</label>
          <input className="input" value={value.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div>
          <label className="label">Dashboard Heading</label>
          <input className="input" value={value['dashboard-heading'] ?? ''} onChange={(e) => set({ 'dashboard-heading': e.target.value })} />
        </div>
        <div>
          <label className="label">Dashboard Subheading</label>
          <input className="input" value={value['dashboard-subheading'] ?? ''} onChange={(e) => set({ 'dashboard-subheading': e.target.value })} />
        </div>
        <div>
          <label className="label">Logo URL</label>
          <input className="input" value={value.logo ?? ''} onChange={(e) => set({ logo: e.target.value })} />
        </div>
        <div>
          <label className="label">Logo Link URL</label>
          <input className="input" value={value.link ?? ''} onChange={(e) => set({ link: e.target.value })} />
        </div>
        <div>
          <label className="label">Default Sort By</label>
          <select className="input" value={value['default-sort-by'] ?? 'name'} onChange={(e) => set({ 'default-sort-by': e.target.value as UIConfig['default-sort-by'] })}>
            <option value="name">Name</option>
            <option value="group">Group</option>
            <option value="health">Health</option>
          </select>
        </div>
        <div>
          <label className="label">Default Filter By</label>
          <select className="input" value={value['default-filter-by'] ?? 'none'} onChange={(e) => set({ 'default-filter-by': e.target.value as UIConfig['default-filter-by'] })}>
            <option value="none">None</option>
            <option value="failing">Failing</option>
            <option value="unstable">Unstable</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="darkmode" checked={value['dark-mode'] ?? true} onChange={(e) => set({ 'dark-mode': e.target.checked })} />
        <label htmlFor="darkmode" className="text-sm text-gray-700">Enable dark mode by default</label>
      </div>

      <div>
        <label className="label">Custom CSS</label>
        <textarea className="input font-mono text-xs" rows={4} value={value['custom-css'] ?? ''} onChange={(e) => set({ 'custom-css': e.target.value })} placeholder="/* custom CSS */" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Custom Buttons</label>
          <button className="btn-secondary text-xs" onClick={addButton}><Plus className="h-3 w-3" /> Add Button</button>
        </div>
        <div className="space-y-2">
          {buttons.map((btn, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="input flex-1" placeholder="Button label" value={btn.name} onChange={(e) => updateButton(i, { name: e.target.value })} />
              <input className="input flex-1" placeholder="https://..." value={btn.link} onChange={(e) => updateButton(i, { link: e.target.value })} />
              <button className="text-red-400 hover:text-red-600" onClick={() => removeButton(i)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

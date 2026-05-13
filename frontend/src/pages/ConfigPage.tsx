import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Settings, Database, Globe, Shield, Clock, Megaphone, Bell, Code, Save, CheckCircle,
} from 'lucide-react'
import { saveConfig, validateConfig } from '../api/config'
import { StorageForm } from '../components/config/StorageForm'
import { WebForm } from '../components/config/WebForm'
import { UIForm } from '../components/config/UIForm'
import { SecurityForm } from '../components/config/SecurityForm'
import { MaintenanceForm } from '../components/config/MaintenanceForm'
import { AnnouncementsForm } from '../components/config/AnnouncementsForm'
import { AlertingForm } from '../components/config/AlertingForm'
import { RawYamlEditor } from '../components/config/RawYamlEditor'
import { ValidationPanel } from '../components/ui/ValidationPanel'
import type { GatusConfig } from '../types/gatus'
import type { ValidationResult, ValidationIssue } from '../api/types'
import { dumpYaml } from '../utils/yamlParse'

const SECTIONS = [
  { id: 'alerting', label: 'Alerting', icon: Bell },
  { id: 'storage', label: 'Storage', icon: Database },
  { id: 'web', label: 'Web', icon: Globe },
  { id: 'ui', label: 'UI', icon: Settings },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'maintenance', label: 'Maintenance', icon: Clock },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'raw', label: 'Raw YAML', icon: Code },
] as const

type SectionId = typeof SECTIONS[number]['id']

interface Props {
  config: GatusConfig
  rawYaml: string
  filename: string
  onConfigChange: (c: GatusConfig, yaml: string) => void
  onRawYamlChange: (yaml: string) => void
  onSaved?: (yaml?: string) => void
}

export function ConfigPage({ config, rawYaml, filename, onConfigChange, onRawYamlChange, onSaved }: Props) {
  const [section, setSection] = useState<SectionId>('alerting')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [saving, setSaving] = useState(false)

  const updateConfig = (next: GatusConfig) => {
    onConfigChange(next, dumpYaml(next))
  }

  const handleValidate = async () => {
    try {
      const res = await validateConfig(rawYaml)
      setValidation(res.data)
      if (res.data.valid) toast.success('Config is valid')
      else toast.error(`${(res.data.errors ?? []).length} error(s) found`)
    } catch {
      toast.error('Validation failed')
    }
  }

  const handleSave = async (force = false) => {
    setSaving(true)
    try {
      await saveConfig(filename, rawYaml, force)
      onSaved?.(rawYaml)
      setValidation(null)
      toast.success('Configuration saved')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (typeof detail === 'object' && detail !== null && 'errors' in detail) {
        const errors = (detail as { errors: ValidationIssue[] }).errors
        setValidation({ valid: false, errors, warnings: [], native_validation_available: false, native_validation_note: '' })
        toast.error(`${errors.length} validation error(s) — see details below`)
      } else {
        toast.error(String(detail) || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
      {/* Section nav — vertical on desktop, horizontal scroll on mobile */}
      <aside className="md:w-44 md:shrink-0">
        {/* Mobile: horizontal scrollable tabs */}
        <div className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                section === id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
        {/* Desktop: vertical list */}
        <nav className="hidden md:block space-y-1 sticky top-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                section === id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {section !== 'raw' && (
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <button className="btn-secondary text-sm" onClick={handleValidate}>
              <CheckCircle className="h-4 w-4" /> Validate
            </button>
            <button className="btn-secondary text-sm" onClick={() => handleSave(true)}>
              Force Save
            </button>
            <button className="btn-primary text-sm" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}

        {validation && section !== 'raw' && <ValidationPanel result={validation} />}

        {section === 'alerting' && (
          <div className="card p-6">
            <AlertingForm
              value={(config.alerting ?? {}) as Record<string, Record<string, unknown>>}
              onChange={(v) => updateConfig({ ...config, alerting: v })}
            />
          </div>
        )}
        {section === 'storage' && (
          <div className="card p-6">
            <StorageForm value={config.storage ?? {}} onChange={(v) => updateConfig({ ...config, storage: v })} />
          </div>
        )}
        {section === 'web' && (
          <div className="card p-6">
            <WebForm value={config.web ?? {}} onChange={(v) => updateConfig({ ...config, web: v })} />
          </div>
        )}
        {section === 'ui' && (
          <div className="card p-6">
            <UIForm value={config.ui ?? {}} onChange={(v) => updateConfig({ ...config, ui: v })} />
          </div>
        )}
        {section === 'security' && (
          <div className="card p-6">
            <SecurityForm value={config.security ?? {}} onChange={(v) => updateConfig({ ...config, security: v })} />
          </div>
        )}
        {section === 'maintenance' && (
          <div className="card p-6">
            <MaintenanceForm
              value={config.maintenance ?? {}}
              onChange={(v) => updateConfig({ ...config, maintenance: v })}
            />
          </div>
        )}
        {section === 'announcements' && (
          <div className="card p-6">
            <AnnouncementsForm
              value={config.announcements ?? []}
              onChange={(v) => updateConfig({ ...config, announcements: v })}
            />
          </div>
        )}
        {section === 'raw' && (
          <div className="card p-6" style={{ height: 'calc(100vh - 10rem)' }}>
            <RawYamlEditor
              filename={filename}
              initialContent={rawYaml}
              onChange={onRawYamlChange}
              onSaved={(content) => { onRawYamlChange(content); onSaved?.(content) }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { AlertingConfig } from '../../types/gatus'

const PROVIDERS = [
  { key: 'slack', label: 'Slack', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }, { name: 'title', label: 'Title', secret: false }] },
  { key: 'discord', label: 'Discord', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }] },
  { key: 'email', label: 'Email', fields: [{ name: 'from', label: 'From', secret: false }, { name: 'username', label: 'SMTP Username', secret: false }, { name: 'password', label: 'SMTP Password', secret: true }, { name: 'host', label: 'SMTP Host', secret: false }, { name: 'port', label: 'SMTP Port', secret: false }, { name: 'to', label: 'To (comma-separated)', secret: false }] },
  { key: 'pagerduty', label: 'PagerDuty', fields: [{ name: 'integration-key', label: 'Integration Key', secret: true }] },
  { key: 'teams', label: 'MS Teams (legacy)', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }] },
  { key: 'teams-workflows', label: 'MS Teams Workflows', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }] },
  { key: 'telegram', label: 'Telegram', fields: [{ name: 'token', label: 'Bot Token', secret: true }, { name: 'id', label: 'Chat ID', secret: false }] },
  { key: 'opsgenie', label: 'Opsgenie', fields: [{ name: 'api-key', label: 'API Key', secret: true }] },
  { key: 'ntfy', label: 'ntfy', fields: [{ name: 'url', label: 'Server URL', secret: false }, { name: 'topic', label: 'Topic', secret: false }] },
  { key: 'gotify', label: 'Gotify', fields: [{ name: 'server-url', label: 'Server URL', secret: false }, { name: 'token', label: 'App Token', secret: true }] },
  { key: 'pushover', label: 'Pushover', fields: [{ name: 'application-token', label: 'Application Token', secret: true }, { name: 'user-key', label: 'User Key', secret: true }] },
  { key: 'googlechat', label: 'Google Chat', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }] },
  { key: 'mattermost', label: 'Mattermost', fields: [{ name: 'webhook-url', label: 'Webhook URL', secret: false }] },
  { key: 'custom', label: 'Custom Webhook', fields: [{ name: 'url', label: 'URL', secret: false }, { name: 'method', label: 'Method', secret: false }] },
]

function ProviderSection({
  label, fields, config, onChange, onRemove,
}: { label: string; fields: { name: string; label: string; secret: boolean }[]; config: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; onRemove: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border rounded-md">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <button className="text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onRemove() }}><Trash2 className="h-4 w-4" /></button>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>
      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                type={f.secret ? 'password' : 'text'}
                className="input"
                value={(config[f.name] as string) ?? ''}
                onChange={(e) => onChange({ ...config, [f.name]: e.target.value })}
                placeholder={f.secret ? '(kept if empty)' : ''}
              />
            </div>
          ))}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 mb-2">Default alert settings</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label text-xs">Failure threshold</label>
                <input type="number" className="input text-sm" value={(config['default-alert'] as Record<string, unknown>)?.['failure-threshold'] as number ?? ''} onChange={(e) => onChange({ ...config, 'default-alert': { ...(config['default-alert'] as object ?? {}), 'failure-threshold': parseInt(e.target.value) || undefined } })} />
              </div>
              <div>
                <label className="label text-xs">Success threshold</label>
                <input type="number" className="input text-sm" value={(config['default-alert'] as Record<string, unknown>)?.['success-threshold'] as number ?? ''} onChange={(e) => onChange({ ...config, 'default-alert': { ...(config['default-alert'] as object ?? {}), 'success-threshold': parseInt(e.target.value) || undefined } })} />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={!!(config['default-alert'] as Record<string, unknown>)?.['send-on-resolved']} onChange={(e) => onChange({ ...config, 'default-alert': { ...(config['default-alert'] as object ?? {}), 'send-on-resolved': e.target.checked } })} />
                  Send on resolved
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  value: AlertingConfig
  onChange: (v: AlertingConfig) => void
}

export function AlertingForm({ value, onChange }: Props) {
  const [adding, setAdding] = useState('')
  const activeKeys = Object.keys(value)

  const addProvider = () => {
    if (!adding || value[adding]) return
    onChange({ ...value, [adding]: {} })
    setAdding('')
  }

  const removeProvider = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const updateProvider = (key: string, config: Record<string, unknown>) =>
    onChange({ ...value, [key]: config })

  const unusedProviders = PROVIDERS.filter((p) => !activeKeys.includes(p.key))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Alerting Providers</h2>
        <div className="flex gap-2">
          <select className="input text-sm w-48" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Select provider…</option>
            {unusedProviders.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="__other">Other (unknown)</option>
          </select>
          <button className="btn-primary text-sm" onClick={addProvider} disabled={!adding}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {activeKeys.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8 border border-dashed rounded-md">
          No alerting providers configured. Add one above.
        </p>
      )}

      <div className="space-y-3">
        {activeKeys.map((key) => {
          const provider = PROVIDERS.find((p) => p.key === key)
          return (
            <ProviderSection
              key={key}
              label={provider?.label ?? key}
              fields={provider?.fields ?? []}
              config={(value[key] as Record<string, unknown>) ?? {}}
              onChange={(cfg) => updateProvider(key, cfg)}
              onRemove={() => removeProvider(key)}
            />
          )
        })}
      </div>
    </div>
  )
}

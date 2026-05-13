import { useState, useEffect } from 'react'
import type { Endpoint, DNSConfig, SSHConfig, ClientConfig } from '../../types/gatus'
import { ConditionsEditor } from './ConditionsEditor'
import { AlertsEditor } from './AlertsEditor'
import { MaintenanceForm } from '../config/MaintenanceForm'

const PROTOCOL_OPTIONS = [
  { value: 'https://', label: 'HTTPS' },
  { value: 'http://', label: 'HTTP' },
  { value: 'icmp://', label: 'ICMP (Ping)' },
  { value: 'tcp://', label: 'TCP' },
  { value: 'udp://', label: 'UDP' },
  { value: 'dns://', label: 'DNS' },
  { value: 'tls://', label: 'TLS' },
  { value: 'starttls://', label: 'STARTTLS' },
  { value: 'ssh://', label: 'SSH' },
  { value: 'grpc://', label: 'gRPC' },
  { value: 'grpcs://', label: 'gRPCS' },
  { value: 'ws://', label: 'WebSocket' },
  { value: 'wss://', label: 'WebSocket (TLS)' },
  { value: 'sctp://', label: 'SCTP' },
  { value: 'http://', label: 'Domain Expiration (HTTP)' },
  { value: 'https://', label: 'Domain Expiration (HTTPS)' },
]

const TABS = ['Basic', 'Conditions', 'Alerts', 'Client', 'Maintenance', 'Advanced'] as const
type Tab = typeof TABS[number]

function getScheme(url: string) {
  const match = url.match(/^([a-z-]+:\/\/)/)
  return match ? match[1] : 'https://'
}

function stripScheme(url: string, scheme: string) {
  return url.startsWith(scheme) ? url.slice(scheme.length) : url
}

interface Props {
  value: Endpoint
  onChange: (v: Endpoint) => void
  onCancel: () => void
  onSave: () => void
  configuredProviders: string[]
}

function headersToText(h?: Record<string, string>) {
  return Object.entries(h ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')
}
function labelsToText(l?: Record<string, string>) {
  return Object.entries(l ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n')
}
function parseKV(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  text.split('\n').forEach((line) => {
    const idx = line.indexOf(':')
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  })
  return out
}

export function EndpointForm({ value, onChange, onCancel, onSave, configuredProviders }: Props) {
  const [tab, setTab] = useState<Tab>('Basic')
  const [scheme, setScheme] = useState(getScheme(value.url || ''))
  const [headersText, setHeadersText] = useState(() => headersToText(value.headers))
  const [labelsText, setLabelsText] = useState(() => labelsToText(value['extra-labels']))
  const set = (patch: Partial<Endpoint>) => onChange({ ...value, ...patch })

  useEffect(() => {
    setHeadersText(headersToText(value.headers))
    setLabelsText(labelsToText(value['extra-labels']))
  }, [value.name])

  const urlWithoutScheme = stripScheme(value.url || '', scheme)

  const handleSchemeChange = (newScheme: string) => {
    setScheme(newScheme)
    set({ url: newScheme + urlWithoutScheme })
  }

  const handleUrlBodyChange = (body: string) => {
    set({ url: scheme + body })
  }

  const isDNS = scheme === 'dns://'
  const isSSH = scheme === 'ssh://'
  const isHTTP = scheme === 'http://' || scheme === 'https://'
  const isDomainExpiration =
    scheme === 'domain-expiration://' ||
    (value.conditions ?? []).some((c) => c.includes('[DOMAIN_EXPIRATION]'))

  function domainExpirationIntervalHint() {
    if (!isDomainExpiration) return null
    const iv = value.interval ?? ''
    const m = iv.match(/^(\d+)(ms|s|m|h|d)$/)
    let secs = 0
    if (m) {
      const n = parseInt(m[1])
      const unit = m[2]
      if (unit === 'ms') secs = n / 1000
      else if (unit === 's') secs = n
      else if (unit === 'm') secs = n * 60
      else if (unit === 'h') secs = n * 3600
      else if (unit === 'd') secs = n * 86400
    }
    if (!iv) return <p className="text-xs text-amber-600 mt-1">WHOIS/RDAP: set explicit interval ≥ 5m. Recommended: 1h.</p>
    if (secs < 300) return <p className="text-xs text-red-600 mt-1">Interval below 5m minimum — Gatus will reject this config (WHOIS/RDAP throttling).</p>
    if (secs < 3600) return <p className="text-xs text-amber-600 mt-1">Interval &lt; 1h may cause WHOIS/RDAP rate limiting. Recommended: 1h+.</p>
    return null
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Basic */}
      {tab === 'Basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input className="input" value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="my-service" required />
            </div>
            <div>
              <label className="label">Group</label>
              <input className="input" value={value.group ?? ''} onChange={(e) => set({ group: e.target.value })} placeholder="production" />
            </div>
            <div>
              <label className="label">Check Interval</label>
              <input className="input" value={value.interval ?? ''} onChange={(e) => set({ interval: e.target.value })} placeholder="5m" />
              {domainExpirationIntervalHint()}
            </div>
          </div>

          <div>
            <label className="label">URL *</label>
            <div className="flex gap-2">
              <select className="input w-48 shrink-0" value={scheme} onChange={(e) => handleSchemeChange(e.target.value)}>
                {PROTOCOL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input className="input flex-1 font-mono" value={urlWithoutScheme} onChange={(e) => handleUrlBodyChange(e.target.value)} placeholder="example.com" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ep-enabled" checked={value.enabled !== false} onChange={(e) => set({ enabled: e.target.checked })} />
            <label htmlFor="ep-enabled" className="text-sm text-gray-700">Endpoint enabled</label>
          </div>

          {isHTTP && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">HTTP Method</label>
                  <select className="input" value={value.method ?? 'GET'} onChange={(e) => set({ method: e.target.value })}>
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={value.graphql ?? false} onChange={(e) => set({ graphql: e.target.checked })} />
                    GraphQL (wrap body)
                  </label>
                </div>
              </div>
              <div>
                <label className="label">Request Body</label>
                <textarea className="input font-mono text-xs" rows={3} value={value.body ?? ''} onChange={(e) => set({ body: e.target.value })} />
              </div>
              <div>
                <label className="label">Headers (key: value, one per line)</label>
                <textarea
                  className="input font-mono text-xs"
                  rows={3}
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  onBlur={() => set({ headers: parseKV(headersText) })}
                  placeholder="Authorization: Bearer token"
                />
              </div>
            </>
          )}

          {isDNS && (
            <div className="border rounded-md p-4 space-y-3">
              <h3 className="text-sm font-medium">DNS Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Query Name</label>
                  <input className="input" value={value.dns?.['query-name'] ?? ''} onChange={(e) => set({ dns: { ...value.dns, 'query-name': e.target.value } as DNSConfig })} placeholder="example.com" />
                </div>
                <div>
                  <label className="label">Query Type</label>
                  <select className="input" value={value.dns?.['query-type'] ?? 'A'} onChange={(e) => set({ dns: { ...value.dns, 'query-type': e.target.value } as DNSConfig })}>
                    {['A', 'AAAA', 'CNAME', 'MX', 'NS', 'PTR', 'SOA', 'SRV', 'TXT'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {isSSH && (
            <div className="border rounded-md p-4 space-y-3">
              <h3 className="text-sm font-medium">SSH Authentication</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Username</label>
                  <input className="input" value={value.ssh?.username ?? ''} onChange={(e) => set({ ssh: { ...value.ssh, username: e.target.value } as SSHConfig })} />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" value={value.ssh?.password ?? ''} onChange={(e) => set({ ssh: { ...value.ssh, password: e.target.value } as SSHConfig })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Private Key</label>
                  <textarea className="input font-mono text-xs" rows={4} value={value.ssh?.['private-key'] ?? ''} onChange={(e) => set({ ssh: { ...value.ssh, 'private-key': e.target.value } as SSHConfig })} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conditions */}
      {tab === 'Conditions' && (
        <ConditionsEditor value={value.conditions ?? []} onChange={(c) => set({ conditions: c })} />
      )}

      {/* Alerts */}
      {tab === 'Alerts' && (
        <AlertsEditor
          value={value.alerts ?? []}
          onChange={(a) => set({ alerts: a })}
          configuredProviders={configuredProviders}
        />
      )}

      {/* Client options */}
      {tab === 'Client' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">HTTP Client Options</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Timeout</label>
              <input className="input" placeholder="10s" value={value.client?.timeout ?? ''} onChange={(e) => set({ client: { ...value.client, timeout: e.target.value } as ClientConfig })} />
            </div>
            <div>
              <label className="label">DNS Resolver</label>
              <input className="input" placeholder="tcp://8.8.8.8:53" value={value.client?.['dns-resolver'] ?? ''} onChange={(e) => set({ client: { ...value.client, 'dns-resolver': e.target.value } as ClientConfig })} />
            </div>
            <div>
              <label className="label">Proxy URL</label>
              <input className="input" value={value.client?.['proxy-url'] ?? ''} onChange={(e) => set({ client: { ...value.client, 'proxy-url': e.target.value } as ClientConfig })} />
            </div>
            <div>
              <label className="label">Network (IP version)</label>
              <select className="input" value={value.client?.network ?? ''} onChange={(e) => set({ client: { ...value.client, network: e.target.value } as ClientConfig })}>
                <option value="">Default</option>
                <option value="ip">ip (any)</option>
                <option value="ip4">ip4 (IPv4)</option>
                <option value="ip6">ip6 (IPv6)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.client?.insecure ?? false} onChange={(e) => set({ client: { ...value.client, insecure: e.target.checked } as ClientConfig })} />
              Skip TLS verification
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={value.client?.['ignore-redirect'] ?? false} onChange={(e) => set({ client: { ...value.client, 'ignore-redirect': e.target.checked } as ClientConfig })} />
              Ignore redirects
            </label>
          </div>
        </div>
      )}

      {/* Maintenance */}
      {tab === 'Maintenance' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Endpoint-specific maintenance windows override the global setting.</p>
          {(value['maintenance-windows'] ?? []).map((mw, i) => (
            <MaintenanceForm
              key={i}
              value={mw}
              onChange={(v) => {
                const next = [...(value['maintenance-windows'] ?? [])]
                next[i] = v
                set({ 'maintenance-windows': next })
              }}
              title={`Maintenance Window ${i + 1}`}
            />
          ))}
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => set({ 'maintenance-windows': [...(value['maintenance-windows'] ?? []), {}] })}
          >
            Add Maintenance Window
          </button>
        </div>
      )}

      {/* Advanced */}
      {tab === 'Advanced' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Extra labels for Prometheus metrics.</p>
          <div>
            <label className="label">Extra Labels (key: value, one per line)</label>
            <textarea
              className="input font-mono text-xs"
              rows={4}
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              onBlur={() => set({ 'extra-labels': parseKV(labelsText) })}
              placeholder="env: production"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn-primary" onClick={onSave}>Save Endpoint</button>
      </div>
    </div>
  )
}

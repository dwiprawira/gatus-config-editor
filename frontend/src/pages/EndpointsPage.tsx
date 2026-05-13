import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Copy, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Endpoint, GatusConfig, Alert } from '../types/gatus'
import { EndpointForm } from '../components/endpoints/EndpointForm'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { getGatusEndpointStatuses } from '../api/gatus'
import type { EndpointStatusOut } from '../api/gatus'

const EMPTY_ENDPOINT: Endpoint = {
  name: '',
  url: 'https://',
  interval: '5m',
  conditions: ['[STATUS] == 200'],
}

function StatusDot({ success }: { success: boolean | null }) {
  if (success === null) return (
    <span className="h-2.5 w-2.5 rounded-full bg-gray-300 inline-block" title="No data yet" />
  )
  if (success) return (
    <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" title="Healthy" />
  )
  return (
    <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block animate-pulse" title="Unhealthy" />
  )
}

function AlertBadges({ alerts }: { alerts?: Alert[] }) {
  if (!alerts || alerts.length === 0) return null
  const types = alerts.map((a) => a.type).filter(Boolean)
  if (types.length === 0) return null
  const show = types.slice(0, 2)
  const overflow = types.length - show.length
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {show.map((t) => (
        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
          {t}
        </span>
      ))}
      {overflow > 0 && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
          +{overflow}
        </span>
      )}
    </div>
  )
}

function DurationBadge({ ms }: { ms: number | null }) {
  if (ms === null) return null
  const color = ms < 200 ? 'text-green-600' : ms < 500 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`text-xs font-mono ${color}`}>{ms}ms</span>
}

interface Props {
  config: GatusConfig
  onSave: (c: GatusConfig) => Promise<void>
}

export function EndpointsPage({ config, onSave }: Props) {
  const configuredProviders = Object.keys(config.alerting ?? {})
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState<Endpoint>(EMPTY_ENDPOINT)
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null)
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [savingEndpoint, setSavingEndpoint] = useState(false)

  const endpoints = config.endpoints ?? []

  // Fetch live status from Gatus API (auto-refresh every 30s)
  const { data: statuses } = useQuery({
    queryKey: ['gatus-endpoint-statuses'],
    queryFn: () => getGatusEndpointStatuses().then((r) => r.data),
    refetchInterval: 30_000,
    retry: false, // don't spam if Gatus is down
  })

  // Build a lookup map: endpoint key → status
  const statusMap = useMemo(() => {
    const map = new Map<string, EndpointStatusOut>()
    statuses?.forEach((s) => {
      map.set(s.key, s)
      // Also index by name for matching with config endpoints
      map.set(s.name, s)
      if (s.group) map.set(`${s.group}_${s.name}`, s)
    })
    return map
  }, [statuses])

  const getStatus = (ep: Endpoint): EndpointStatusOut | undefined => {
    const group = ep.group ?? ''
    return (
      statusMap.get(group ? `${group}_${ep.name}` : ep.name) ??
      statusMap.get(ep.name)
    )
  }

  const groups = useMemo(() => {
    const g = new Set(endpoints.map((e) => e.group ?? 'ungrouped'))
    return ['all', ...Array.from(g)]
  }, [endpoints])

  const filtered = groupFilter === 'all' ? endpoints : endpoints.filter((e) => (e.group ?? 'ungrouped') === groupFilter)

  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>()
    filtered.forEach((ep) => {
      const g = ep.group ?? 'ungrouped'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(ep)
    })
    map.forEach((eps) => eps.sort((a, b) => a.name.localeCompare(b.name)))
    return map
  }, [filtered])

  const persistEndpoints = async (eps: Endpoint[]) => {
    const next = { ...config, endpoints: eps }
    setSavingEndpoint(true)
    try {
      await onSave(next)
      toast.success('Endpoint saved')
    } catch (error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const validationErrors = (
        typeof detail === 'object' && detail !== null && 'errors' in detail
          ? (detail as { errors: { field: string; message: string }[] }).errors
          : []
      )
      if (validationErrors.length > 0) {
        validationErrors.forEach((e) => toast.error(e.message, { duration: 6000 }))
      } else {
        toast.error('Failed to save endpoint')
      }
      throw error
    } finally {
      setSavingEndpoint(false)
    }
  }
  const startAdd = () => { setDraft({ ...EMPTY_ENDPOINT }); setIsAdding(true) }
  const startEdit = (i: number) => { setDraft({ ...endpoints[i] }); setEditIdx(i) }

  const saveNew = async () => {
    const next = [...endpoints, draft]
    await persistEndpoints(next)
    setIsAdding(false)
  }
  const saveEdit = async () => {
    if (editIdx === null) return
    const next = [...endpoints]; next[editIdx] = draft
    await persistEndpoints(next); setEditIdx(null)
  }

  const duplicate = async (i: number) => {
    const copy = { ...endpoints[i], name: `${endpoints[i].name}-copy` }
    await persistEndpoints([...endpoints.slice(0, i + 1), copy, ...endpoints.slice(i + 1)])
  }

  const confirmDelete = async () => {
    if (deleteIdx === null) return
    await persistEndpoints(endpoints.filter((_, i) => i !== deleteIdx))
    setDeleteIdx(null)
  }

  const toggleGroup = (g: string) => {
    const next = new Set(collapsedGroups)
    next.has(g) ? next.delete(g) : next.add(g)
    setCollapsedGroups(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Endpoints</h1>
          {savingEndpoint && <p className="text-xs text-gray-500 mt-1">Saving endpoint changes…</p>}
        </div>
        <button className="btn-primary shrink-0" onClick={startAdd} disabled={savingEndpoint}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Endpoint</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 flex-wrap">
        {groups.map((g) => (
          <button
            key={g}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              groupFilter === g
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
            }`}
            onClick={() => setGroupFilter(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Endpoint list */}
      {endpoints.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="mb-4">No endpoints configured.</p>
          <button className="btn-primary" onClick={startAdd}><Plus className="h-4 w-4" /> Add your first endpoint</button>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([group, eps]) => {
            const healthyCount = eps.filter((ep) => getStatus(ep)?.success === true).length
            const unhealthyCount = eps.filter((ep) => getStatus(ep)?.success === false).length

            return (
              <div key={group} className="card">
                <button
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  onClick={() => toggleGroup(group)}
                >
                  {collapsedGroups.has(group) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="uppercase tracking-wide text-xs text-gray-500">{group}</span>
                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-2">
                    {statuses && (
                      <>
                        {unhealthyCount > 0 && (
                          <span className="text-red-500 font-medium">{unhealthyCount} down</span>
                        )}
                        {healthyCount > 0 && (
                          <span className="text-green-600">{healthyCount} up</span>
                        )}
                      </>
                    )}
                    <span>{eps.length} endpoint(s)</span>
                  </span>
                </button>

                {!collapsedGroups.has(group) && (
                  <div className="divide-y border-t">
                    {eps.map((ep) => {
                      const idx = endpoints.indexOf(ep)
                      const status = getStatus(ep)
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3">
                          <StatusDot success={status?.success ?? null} />

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{ep.name}</p>
                            <p className="text-xs text-gray-400 font-mono truncate">{ep.url}</p>
                            <div className="flex items-center gap-2 mt-0.5 sm:hidden text-xs text-gray-400">
                              <DurationBadge ms={status?.last_duration_ms ?? null} />
                              <span>{ep.interval ?? '60s'}</span>
                              <AlertBadges alerts={ep.alerts} />
                            </div>
                          </div>

                          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
                            <DurationBadge ms={status?.last_duration_ms ?? null} />
                            <span>{ep.interval ?? '60s'}</span>
                            <AlertBadges alerts={ep.alerts} />
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button className="p-1.5 text-gray-400 hover:text-brand-600" onClick={() => startEdit(idx)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                            <button className="p-1.5 text-gray-400 hover:text-brand-600" onClick={() => duplicate(idx)} title="Duplicate"><Copy className="h-4 w-4" /></button>
                            <button className="p-1.5 text-gray-400 hover:text-red-600" onClick={() => setDeleteIdx(idx)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add modal */}
      <Modal open={isAdding} onClose={() => setIsAdding(false)} title="Add Endpoint" size="xl">
        <EndpointForm value={draft} onChange={setDraft} onCancel={() => setIsAdding(false)} onSave={saveNew} configuredProviders={configuredProviders} />
      </Modal>

      {/* Edit modal */}
      <Modal open={editIdx !== null} onClose={() => setEditIdx(null)} title="Edit Endpoint" size="xl">
        <EndpointForm value={draft} onChange={setDraft} onCancel={() => setEditIdx(null)} onSave={saveEdit} configuredProviders={configuredProviders} />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteIdx !== null}
        title="Delete Endpoint"
        message={`Delete "${endpoints[deleteIdx ?? 0]?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteIdx(null)}
      />
    </div>
  )
}

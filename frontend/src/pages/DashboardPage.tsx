import type { ElementType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Server, FileText, Activity } from 'lucide-react'
import { getGatusStatus } from '../api/gatus'
import { getConfigFiles, getConfigFile } from '../api/config'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { parseYaml } from '../utils/yamlParse'

function StatusIndicator({ status }: { status: string }) {
  if (status === 'running') return <Badge label="Running" variant="green" />
  if (status === 'unavailable') return <Badge label="Unavailable" variant="gray" />
  return <Badge label={status} variant="red" />
}

function StatCard({
  icon: Icon, label, value, to,
}: { icon: ElementType; label: string; value: string | number; to?: string }) {
  const content = (
    <div className="card p-5 flex items-center gap-4">
      <div className="rounded-lg bg-brand-50 p-3">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : <div>{content}</div>
}

export function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['gatus-status'],
    queryFn: () => getGatusStatus().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: files } = useQuery({
    queryKey: ['config-files'],
    queryFn: () => getConfigFiles().then((r) => r.data),
  })

  // Reuse the same query key as AppShell so TanStack Query deduplicates the request
  const primaryFile = files?.[0]?.name ?? ''
  const { data: fileContent } = useQuery({
    queryKey: ['config-file', primaryFile],
    queryFn: () => getConfigFile(primaryFile).then((r) => r.data),
    enabled: !!primaryFile,
  })

  const config = fileContent ? parseYaml(fileContent.content) : null
  const endpointCount = (config?.endpoints?.length ?? 0) + (config?.['external-endpoints']?.length ?? 0)
  const endpointDisplay = fileContent ? endpointCount : '—'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Gatus container status */}
      <div className="card p-6">
        <h2 className="section-title flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-600" />
          Gatus Container
        </h2>
        {statusLoading ? (
          <Spinner />
        ) : status ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Status</p>
              <StatusIndicator status={status.status} />
            </div>
            <div>
              <p className="text-gray-500">Container</p>
              <p className="font-mono text-gray-900">{status.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Image</p>
              <p className="font-mono text-gray-900 text-xs break-all">{status.image || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Health</p>
              <p className="text-gray-900">{status.health || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Started</p>
              <p className="text-gray-900 text-xs">
                {status.started_at ? new Date(status.started_at).toLocaleString() : '—'}
              </p>
            </div>
            {status.error && (
              <div className="col-span-3">
                <p className="text-red-600 text-xs">{status.error}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Config Files" value={files?.length ?? '—'} to="/config" />
        <StatCard icon={Server} label="Endpoints" value={endpointDisplay} to="/endpoints" />
        <StatCard icon={Activity} label="Container Status" value={status?.status ?? '—'} to="/operations" />
      </div>

      {/* Quick links */}
      <div className="card p-6">
        <h2 className="section-title">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/config" className="btn-primary">Edit Configuration</Link>
          <Link to="/endpoints" className="btn-secondary">Manage Endpoints</Link>
          <Link to="/backups" className="btn-secondary">View Backups</Link>
          <Link to="/operations" className="btn-secondary">Restart Gatus</Link>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RefreshCw, Activity, Terminal, AlertTriangle } from 'lucide-react'
import { getGatusStatus, restartGatus, getGatusLogs } from '../api/gatus'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

function statusVariant(s: string) {
  if (s === 'running') return 'green'
  if (s === 'unavailable') return 'gray'
  return 'red'
}

export function OperationsPage() {
  const qc = useQueryClient()
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [logTail, setLogTail] = useState(100)

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['gatus-status'],
    queryFn: () => getGatusStatus().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['gatus-logs', logTail],
    queryFn: () => getGatusLogs(logTail).then((r) => r.data),
    refetchInterval: 30_000,
  })

  const restartMutation = useMutation({
    mutationFn: restartGatus,
    onSuccess: (res) => {
      toast.success(res.data.message)
      qc.invalidateQueries({ queryKey: ['gatus-status'] })
      qc.invalidateQueries({ queryKey: ['gatus-logs'] })
      setConfirmRestart(false)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail || 'Restart failed')
      setConfirmRestart(false)
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Restart / Logs</h1>

      {/* Container status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-600" />
            Gatus Container Status
          </h2>
          <button className="btn-secondary text-sm" onClick={() => refetchStatus()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {statusLoading ? <Spinner /> : status ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Status</p>
                <Badge label={status.status} variant={statusVariant(status.status) as 'green' | 'red' | 'yellow' | 'blue' | 'gray'} />
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Container</p>
                <p className="font-mono text-gray-900">{status.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Container ID</p>
                <p className="font-mono text-gray-900 text-xs">{status.container_id || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Health</p>
                <p className="text-gray-900">{status.health || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Image</p>
                <p className="font-mono text-gray-900 text-xs break-all">{status.image || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Started At</p>
                <p className="text-gray-900 text-xs">
                  {status.started_at ? new Date(status.started_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {status.error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{status.error}</p>
              </div>
            )}

            {!status.docker_available && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
                Docker socket is not accessible. Ensure /var/run/docker.sock is mounted in the backend container.
              </div>
            )}

            <div className="pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700 mb-3">
                <strong>Note:</strong> Gatus automatically reloads its config when the file changes on disk.
                A full container restart is only needed for changes that require a process restart.
              </div>
              <button
                className="btn-danger"
                onClick={() => setConfirmRestart(true)}
                disabled={!status.docker_available || restartMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
                {restartMutation.isPending ? 'Restarting…' : 'Restart Gatus'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Logs */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-brand-600" />
            Container Logs
          </h2>
          <div className="flex gap-2 items-center">
            <select
              className="input text-sm w-28"
              value={logTail}
              onChange={(e) => setLogTail(parseInt(e.target.value))}
            >
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
              <option value={200}>Last 200</option>
              <option value={500}>Last 500</option>
            </select>
            <button className="btn-secondary text-sm" onClick={() => refetchLogs()}>
              <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {logsLoading ? <Spinner /> : logsData ? (
          <pre className="bg-gray-900 text-green-400 rounded-md p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
            {logsData.logs || '(no logs)'}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">
            Logs unavailable — Docker socket not accessible.
          </p>
        )}
      </div>

      {/* Restart confirm */}
      <ConfirmDialog
        open={confirmRestart}
        title="Restart Gatus"
        message="This will restart the Gatus container via the Docker socket. The status page will be temporarily unavailable. Continue?"
        confirmLabel="Restart"
        danger
        onConfirm={() => restartMutation.mutate()}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  )
}

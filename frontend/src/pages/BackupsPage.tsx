import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArchiveRestore, Eye, GitCompare, Download } from 'lucide-react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { getBackups, getBackup, rollback, diffBackup } from '../api/config'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}

interface Props {
  currentFile: string
}

export function BackupsPage({ currentFile }: Props) {
  const qc = useQueryClient()
  const [viewId, setViewId] = useState<string | null>(null)
  const [diffId, setDiffId] = useState<string | null>(null)
  const [rollbackId, setRollbackId] = useState<string | null>(null)

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups', currentFile],
    queryFn: () => getBackups(currentFile).then((r) => r.data),
  })

  const { data: viewContent } = useQuery({
    queryKey: ['backup-content', viewId],
    queryFn: () => viewId ? getBackup(viewId).then((r) => r.data) : null,
    enabled: !!viewId,
  })

  const { data: diffData } = useQuery({
    queryKey: ['backup-diff', diffId, currentFile],
    queryFn: () => diffId ? diffBackup(diffId, currentFile).then((r) => r.data) : null,
    enabled: !!diffId,
  })

  const rollbackMutation = useMutation({
    mutationFn: (backupId: string) => rollback(backupId, currentFile),
    onSuccess: () => {
      toast.success('Config restored from backup')
      qc.invalidateQueries({ queryKey: ['backups'] })
      qc.invalidateQueries({ queryKey: ['config-file'] })
      setRollbackId(null)
    },
    onError: () => toast.error('Rollback failed'),
  })

  // Split unified diff into old/new content for the diff viewer
  function splitDiff(diff: string): { oldValue: string; newValue: string } {
    const lines = diff.split('\n')
    const old: string[] = []
    const next: string[] = []
    for (const line of lines) {
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) continue
      if (line.startsWith('-')) old.push(line.slice(1))
      else if (line.startsWith('+')) next.push(line.slice(1))
      else { old.push(line); next.push(line) }
    }
    return { oldValue: old.join('\n'), newValue: next.join('\n') }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
        <div className="text-sm text-gray-500">
          <span className="font-mono">{currentFile}</span>
        </div>
      </div>

      {!backups?.length ? (
        <div className="card p-12 text-center text-gray-400">
          <ArchiveRestore className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No backups yet. Backups are created automatically before each save.</p>
        </div>
      ) : (
        <div className="card divide-y">
          {backups.map((backup) => (
            <div key={backup.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 font-mono truncate">{backup.backup}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                  <span>{formatDate(backup.timestamp)}</span>
                  <span>by {backup.user}</span>
                  <span className="font-mono">{backup.sha256.slice(0, 8)}…</span>
                  {!backup.exists && <span className="text-red-500">File missing</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-secondary text-xs" onClick={() => setViewId(backup.id)}>
                  <Eye className="h-3 w-3" /> View
                </button>
                <button className="btn-secondary text-xs" onClick={() => setDiffId(backup.id)}>
                  <GitCompare className="h-3 w-3" /> Diff
                </button>
                <a
                  href={`/api/config/backups/${backup.id}/download`}
                  download={backup.backup}
                  className="btn-secondary text-xs"
                >
                  <Download className="h-3 w-3" /> Download
                </a>
                <button
                  className="btn-danger text-xs"
                  onClick={() => setRollbackId(backup.id)}
                  disabled={!backup.exists}
                >
                  <ArchiveRestore className="h-3 w-3" /> Restore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View modal */}
      <Modal open={!!viewId} onClose={() => setViewId(null)} title="Backup Content" size="xl">
        <pre className="text-xs font-mono bg-gray-50 rounded p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap">
          {viewContent?.content ?? 'Loading…'}
        </pre>
      </Modal>

      {/* Diff modal */}
      <Modal open={!!diffId} onClose={() => setDiffId(null)} title="Diff: Backup → Current" size="xl">
        {diffData ? (
          diffData.diff ? (
            <div className="overflow-auto max-h-[60vh] text-xs">
              <ReactDiffViewer
                {...splitDiff(diffData.diff)}
                splitView
                leftTitle="Backup"
                rightTitle="Current"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No differences — files are identical.</p>
          )
        ) : <Spinner />}
      </Modal>

      {/* Rollback confirm */}
      <ConfirmDialog
        open={!!rollbackId}
        title="Restore Backup"
        message="This will overwrite the current config with the backup. The current config will be backed up first."
        confirmLabel="Restore"
        danger
        onConfirm={() => rollbackId && rollbackMutation.mutate(rollbackId)}
        onCancel={() => setRollbackId(null)}
      />
    </div>
  )
}

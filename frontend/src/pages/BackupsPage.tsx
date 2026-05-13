import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArchiveRestore, Eye, GitCompare, Download, Trash2 } from 'lucide-react'
import { getBackups, getBackup, rollback, diffBackup, deleteBackup } from '../api/config'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

function formatDate(ts: string) {
  return new Date(ts).toLocaleString()
}

type DiffLine = { type: 'same' | 'removed' | 'added'; line: string }

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const n = oldLines.length, m = newLines.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
  const result: DiffLine[] = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', line: oldLines[i - 1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', line: newLines[j - 1] }); j--
    } else {
      result.unshift({ type: 'removed', line: oldLines[i - 1] }); i--
    }
  }
  return result
}

function DiffView({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  const oldLines = oldValue.split('\n')
  const newLines = newValue.split('\n')
  const lines = (oldLines.length + newLines.length > 1000)
    ? oldLines.map((l, i) => newLines[i] === l
        ? { type: 'same' as const, line: l }
        : { type: 'removed' as const, line: l })
    : computeDiff(oldLines, newLines)

  return (
    <div className="overflow-auto max-h-[60vh] rounded border border-gray-200 font-mono text-xs bg-white select-text">
      {lines.map((item, idx) => (
        <div
          key={idx}
          className={`flex px-3 py-px whitespace-pre ${
            item.type === 'removed' ? 'bg-red-50 text-red-800' :
            item.type === 'added'   ? 'bg-green-50 text-green-800' :
            'text-gray-700'
          }`}
        >
          <span className="w-4 shrink-0 select-none text-gray-400 mr-2">
            {item.type === 'removed' ? '-' : item.type === 'added' ? '+' : ' '}
          </span>
          <span>{item.line}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  currentFile: string
}

export function BackupsPage({ currentFile }: Props) {
  const qc = useQueryClient()
  const [viewId, setViewId] = useState<string | null>(null)
  const [diffId, setDiffId] = useState<string | null>(null)
  const [rollbackId, setRollbackId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBackup(id),
    onSuccess: () => {
      toast.success('Backup deleted')
      qc.invalidateQueries({ queryKey: ['backups'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(ids.map((id) => deleteBackup(id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    setBatchDeleting(false)
    setBatchDeleteOpen(false)
    setSelectedIds(new Set())
    qc.invalidateQueries({ queryKey: ['backups'] })
    if (failed === 0) toast.success(`${ids.length} backup(s) deleted`)
    else toast.error(`${failed} deletion(s) failed, ${ids.length - failed} succeeded`)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = !!backups?.length && backups.every((b) => selectedIds.has(b.id))
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(backups?.map((b) => b.id) ?? []))
  }

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

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              className="btn-secondary text-xs text-red-600 hover:text-red-700"
              onClick={() => setBatchDeleteOpen(true)}
              disabled={batchDeleting}
            >
              <Trash2 className="h-3 w-3" /> Delete selected ({selectedIds.size})
            </button>
          )}
          <span className="text-sm text-gray-500 font-mono">{currentFile}</span>
        </div>
      </div>

      {!backups?.length ? (
        <div className="card p-12 text-center text-gray-400">
          <ArchiveRestore className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No backups yet. Backups are created automatically before each save.</p>
        </div>
      ) : (
        <div className="card divide-y">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-gray-50 rounded-t-lg">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-gray-300"
              title="Select all"
            />
            <span className="text-xs text-gray-500">Select all</span>
          </div>
          {backups.map((backup) => (
            <div key={backup.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 ${selectedIds.has(backup.id) ? 'bg-blue-50' : ''}`}>
              <input
                type="checkbox"
                checked={selectedIds.has(backup.id)}
                onChange={() => toggleSelect(backup.id)}
                className="h-4 w-4 rounded border-gray-300 shrink-0"
              />
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
                <button
                  className="btn-secondary text-xs text-red-600 hover:text-red-700"
                  onClick={() => setDeleteId(backup.id)}
                >
                  <Trash2 className="h-3 w-3" /> Delete
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
          diffData.old_content !== diffData.new_content ? (
            <DiffView oldValue={diffData.old_content} newValue={diffData.new_content} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No differences — files are identical.</p>
          )
        ) : <Spinner />}
      </Modal>

      {/* Batch delete confirm */}
      <ConfirmDialog
        open={batchDeleteOpen}
        title="Delete Selected Backups"
        message={`Permanently delete ${selectedIds.size} backup(s)? This cannot be undone.`}
        confirmLabel={batchDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
        danger
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleteOpen(false)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Backup"
        message="Permanently delete this backup? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

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

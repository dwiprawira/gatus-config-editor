import api from './client'
import type {
  BackupContent,
  BackupMeta,
  ConfigContent,
  ConfigFileSummary,
  DiffResponse,
  ValidationResult,
} from './types'

export const getConfigFiles = () =>
  api.get<ConfigFileSummary[]>('/config/files')

export const getConfigFile = (name: string) =>
  api.get<ConfigContent>('/config/file', { params: { name } })

export const writeConfigFile = (name: string, content: string) =>
  api.post<ConfigContent>('/config/file', { name, content })

export const saveConfig = (name: string, content: string, force = false) =>
  api.post<ConfigContent>('/config/save', { name, content, force })

export const validateConfig = (content: string) =>
  api.post<ValidationResult>('/config/validate', { content })

export const getBackups = (file?: string) =>
  api.get<BackupMeta[]>('/config/backups', { params: file ? { file } : {} })

export const getBackup = (id: string) =>
  api.get<BackupContent>(`/config/backups/${id}`)

export const downloadBackup = (id: string) =>
  api.get<string>(`/config/backups/${id}/download`)

export const rollback = (backup_id: string, target_file: string) =>
  api.post<ConfigContent>('/config/rollback', { backup_id, target_file })

export const diffBackup = (backup_id: string, target_file: string) =>
  api.post<DiffResponse>('/config/diff', { backup_id, target_file })

export const deleteBackup = (id: string) =>
  api.delete(`/config/backups/${id}`)

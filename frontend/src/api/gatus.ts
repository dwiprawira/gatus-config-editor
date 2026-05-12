import api from './client'
import type { GatusStatus, LogsResponse, RestartResponse } from './types'

export const getGatusStatus = () => api.get<GatusStatus>('/gatus/status')

export const restartGatus = () => api.post<RestartResponse>('/gatus/restart')

export const getGatusLogs = (tail = 100) =>
  api.get<LogsResponse>('/gatus/logs', { params: { tail } })

export interface EndpointStatusOut {
  key: string
  name: string
  group: string
  success: boolean | null
  last_duration_ms: number | null
}

export const getGatusEndpointStatuses = () =>
  api.get<EndpointStatusOut[]>('/gatus/endpoints')

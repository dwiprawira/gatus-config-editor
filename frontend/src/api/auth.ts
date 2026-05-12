import api, { setCsrfToken, clearCsrfToken } from './client'
import type { LoginResponse, UserInfo } from './types'

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>('/auth/login', { username, password })
  setCsrfToken(res.data.csrf_token)
  return res.data
}

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout')
  clearCsrfToken()
}

export const getMe = async (): Promise<UserInfo> => {
  const res = await api.get<UserInfo>('/auth/me')
  if (res.data.csrf_token) {
    setCsrfToken(res.data.csrf_token)
  }
  return res.data
}

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ConfigPage } from './pages/ConfigPage'
import { EndpointsPage } from './pages/EndpointsPage'
import { BackupsPage } from './pages/BackupsPage'
import { OperationsPage } from './pages/OperationsPage'
import { Spinner } from './components/ui/Spinner'

import { getMe } from './api/auth'
import { getConfigFiles, getConfigFile } from './api/config'
import { useAuthStore } from './stores/authStore'
import type { GatusConfig } from './types/gatus'
import { parseYaml, dumpYaml } from './utils/yamlParse'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    getMe()
      .then((u) => { setUser(u); setChecked(true) })
      .catch(() => { setUser(null); setChecked(true) })
  }, [setUser])

  if (!checked) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppShell() {
  // Global config state — loaded once and shared across pages
  const [rawYaml, setRawYaml] = useState('')
  const [config, setConfig] = useState<GatusConfig>({})
  const [currentFile, setCurrentFile] = useState('')

  const { data: files } = useQuery({
    queryKey: ['config-files'],
    queryFn: () => getConfigFiles().then((r) => r.data),
  })

  const primaryFile = files?.[0]?.name ?? 'config.yaml'

  const { data: fileContent } = useQuery({
    queryKey: ['config-file', primaryFile],
    queryFn: () => getConfigFile(primaryFile).then((r) => r.data),
    enabled: !!primaryFile,
  })

  useEffect(() => {
    if (fileContent) {
      setRawYaml(fileContent.content)
      setConfig(parseYaml(fileContent.content))
      setCurrentFile(fileContent.name)
    }
  }, [fileContent])

  const handleConfigChange = (next: GatusConfig, yaml: string) => {
    setConfig(next)
    setRawYaml(yaml)
  }

  const handleRawYamlChange = (yaml: string) => {
    setRawYaml(yaml)
    setConfig(parseYaml(yaml))
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="config"
          element={
            <ConfigPage
              config={config}
              rawYaml={rawYaml}
              filename={currentFile}
              onConfigChange={handleConfigChange}
              onRawYamlChange={handleRawYamlChange}
            />
          }
        />
        <Route
          path="endpoints"
          element={
            <EndpointsPage
              config={config}
              onChange={(next) => handleConfigChange(next, dumpYaml(next))}
            />
          }
        />
        <Route
          path="backups"
          element={<BackupsPage currentFile={currentFile} />}
        />
        <Route path="operations" element={<OperationsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}

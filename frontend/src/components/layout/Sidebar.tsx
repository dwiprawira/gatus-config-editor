import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Server, Database, ArchiveRestore,
  Terminal, FileCode,
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/config', label: 'Configuration', icon: Settings },
  { to: '/endpoints', label: 'Endpoints', icon: Server },
  { to: '/backups', label: 'Backups', icon: ArchiveRestore },
  { to: '/operations', label: 'Restart / Logs', icon: Terminal },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileCode className="h-6 w-6 text-brand-600" />
          <span className="font-bold text-gray-900 text-sm">Gatus Editor</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

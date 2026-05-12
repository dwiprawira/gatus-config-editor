import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Server, ArchiveRestore,
  Terminal, FileCode, X,
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/config', label: 'Configuration', icon: Settings },
  { to: '/endpoints', label: 'Endpoints', icon: Server },
  { to: '/backups', label: 'Backups', icon: ArchiveRestore },
  { to: '/operations', label: 'Restart / Logs', icon: Terminal },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  // Close sidebar on route change for mobile
  useEffect(() => {
    if (open) onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sidebarContent = (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-6 w-6 text-brand-600" />
          <span className="font-bold text-gray-900 text-sm">Gatus Editor</span>
        </div>
        <button
          className="md:hidden text-gray-400 hover:text-gray-600 p-1"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
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

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden md:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile: overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative z-10 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}

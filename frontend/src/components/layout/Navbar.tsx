import { Menu, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

interface Props {
  onMenuClick: () => void
}

export function Navbar({ onMenuClick }: Props) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      setUser(null)
      navigate('/login')
    }
  }

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 gap-4 shrink-0">
      <button
        className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3 ml-auto">
        {user && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <User className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline truncate max-w-32">{user.username}</span>
          </div>
        )}
        <button onClick={handleLogout} className="btn-secondary text-xs" title="Log out">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}

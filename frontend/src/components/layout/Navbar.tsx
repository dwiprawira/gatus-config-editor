import { LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

export function Navbar() {
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
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-end px-6 gap-4">
      {user && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user.username}</span>
        </div>
      )}
      <button onClick={handleLogout} className="btn-secondary text-xs" title="Log out">
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </header>
  )
}

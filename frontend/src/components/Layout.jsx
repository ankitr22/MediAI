import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, Camera, Users, LogOut, Activity } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()
  const username = localStorage.getItem('username') || 'Doctor'

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  const navItems = [
    { to: '/chat', icon: MessageSquare, label: 'Medical Chat' },
    { to: '/skin', icon: Camera, label: 'Skin Classifier' },
    { to: '/patients', icon: Users, label: 'Patients' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">MediAI</h1>
              <p className="text-blue-300 text-xs">Medical Intelligence</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-md'
                    : 'text-blue-100 hover:bg-blue-700'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{username}</p>
              <p className="text-blue-300 text-xs">Doctor</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-blue-200 hover:text-white hover:bg-blue-700 rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

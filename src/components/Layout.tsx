import { Outlet, NavLink } from 'react-router-dom'
import { Search, BookOpen, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Discover', icon: Search },
  { to: '/log', label: 'Log Meal', icon: BookOpen },
  { to: '/friends', label: 'Friends', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-lg text-primary">PlateWise</span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="border-t bg-white sticky bottom-0">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

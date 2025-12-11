import { useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  BookOpen,
  LogOut,
  User,
  GraduationCap,
  Shield,
  Users,
  BarChart3,
  Settings,
  Pencil,
} from 'lucide-react'

const baseNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Kurslar', href: '/courses', icon: BookOpen },
]

const adminNavigation = [
  { name: 'Admin Paneli', href: '/admin', icon: Shield },
  { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
  { name: 'Raporlar', href: '/admin/reports', icon: BarChart3 },
  { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
]

const instructorNavigation = [
  { name: 'Eğitmen Paneli', href: '/instructor', icon: BookOpen },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const { settings, fetchSettings } = useSettingsStore()
  const location = useLocation()

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Kullanıcı rolüne göre navigasyon oluştur
  const navigation = [
    ...baseNavigation,
    ...(user?.role === 'ADMIN' ? adminNavigation : []),
    ...(user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN' ? instructorNavigation : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-4 border-b">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">{settings.siteName}</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/admin' && item.href !== '/instructor' && location.pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <Link 
              to="/profile" 
              className="group flex items-center gap-3 mb-4 p-2 -mx-2 rounded-lg hover:bg-accent transition-all cursor-pointer border border-transparent hover:border-primary/20"
            >
              <div className="relative h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary group-hover:scale-90 transition-transform" />
                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === 'ADMIN'
                    ? 'Yönetici'
                    : user?.role === 'INSTRUCTOR'
                      ? 'Eğitmen'
                      : 'Öğrenci'}
                </p>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

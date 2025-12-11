import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, GraduationCap, TrendingUp, Settings, UserPlus, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { api } from '../lib/api'

interface OverviewStats {
  totalUsers: number
  totalCourses: number
  totalLessons: number
  totalEnrollments: number
  usersByRole: Record<string, number>
  recentEnrollments: Array<{
    id: string
    enrolledAt: string
    user: { id: string; name: string; email: string }
    course: { id: string; title: string }
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get('/analytics/overview')
      setStats(response.data.data)
    } catch (error) {
      console.error('İstatistikler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Paneli</h1>
          <p className="text-muted-foreground">Sistem yönetimi ve istatistikler</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Kullanıcılar
            </Button>
          </Link>
          <Link to="/admin/courses">
            <Button>
              <BookOpen className="w-4 h-4 mr-2" />
              Kurslar
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.usersByRole?.STUDENT || 0} öğrenci, {stats?.usersByRole?.INSTRUCTOR || 0} eğitmen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kurs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalLessons || 0} ders içeriği
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kayıtlar</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEnrollments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Toplam kurs kaydı
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adminler</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersByRole?.ADMIN || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sistem yöneticisi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hızlı İşlemler</CardTitle>
            <CardDescription>Sık kullanılan yönetim işlemleri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/users/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Kullanıcı Ekle
              </Button>
            </Link>
            <Link to="/admin/courses/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="w-4 h-4 mr-2" />
                Yeni Kurs Oluştur
              </Button>
            </Link>
            <Link to="/admin/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Detaylı Raporlar
              </Button>
            </Link>
            <Link to="/admin/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Sistem Ayarları
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Son Kayıtlar</CardTitle>
            <CardDescription>En son kurs kayıtları</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentEnrollments?.slice(0, 5).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{enrollment.user.name}</p>
                    <p className="text-xs text-muted-foreground">{enrollment.course.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(enrollment.enrolledAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
              {(!stats?.recentEnrollments || stats.recentEnrollments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Henüz kayıt yok
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Dağılımı</CardTitle>
          <CardDescription>Rol bazlı kullanıcı istatistikleri</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="p-3 bg-blue-100 rounded-full">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats?.usersByRole?.STUDENT || 0}</p>
                <p className="text-sm text-blue-600/70">Öğrenci</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats?.usersByRole?.INSTRUCTOR || 0}</p>
                <p className="text-sm text-green-600/70">Eğitmen</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats?.usersByRole?.ADMIN || 0}</p>
                <p className="text-sm text-purple-600/70">Admin</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

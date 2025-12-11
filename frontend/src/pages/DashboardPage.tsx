import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { coursesApi, progressApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, Trophy, TrendingUp } from 'lucide-react'

interface EnrolledCourse {
  id: string
  course: {
    id: string
    title: string
    thumbnail?: string
    modules: { lessons: { id: string }[] }[]
  }
  enrolledAt: string
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  isCompleted: boolean
}

interface Stats {
  totalWatchedHours: number
  totalWatchedMinutes: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, statsRes] = await Promise.all([
          coursesApi.getEnrolled(),
          progressApi.getStats(),
        ])
        setEnrolledCourses(coursesRes.data.data || [])
        setStats(statsRes.data.data)
      } catch (error) {
        console.error('Dashboard verisi yüklenemedi:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const totalLessons = enrolledCourses.reduce(
    (acc, e) => acc + (e.totalLessons || e.course.modules.reduce((a, m) => a + m.lessons.length, 0)),
    0
  )

  const completedCourses = enrolledCourses.filter(e => e.isCompleted).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Hoş geldin, {user?.name}!</h1>
        <p className="text-muted-foreground mt-1">
          Eğitim yolculuğuna devam et
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kayıtlı Kurslar</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrolledCourses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">İzleme Süresi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalWatchedHours || 0} saat
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalWatchedMinutes || 0} dakika
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses}</div>
            <p className="text-xs text-muted-foreground">kurs</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Devam Eden Kurslar</h2>
          <Link
            to="/courses"
            className="text-sm text-primary hover:underline"
          >
            Tüm kursları gör
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Yükleniyor...
          </div>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                Henüz bir kursa kayıt olmadınız
              </p>
              <Link
                to="/courses"
                className="text-primary hover:underline"
              >
                Kursları keşfet
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((enrollment) => (
              <Link
                key={enrollment.id}
                to={`/courses/${enrollment.course.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    {enrollment.course.thumbnail ? (
                      <img
                        src={enrollment.course.thumbnail}
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">
                      {enrollment.course.title}
                    </h3>
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>İlerleme</span>
                        <span>{enrollment.progressPercentage || 0}%</span>
                      </div>
                      <Progress value={enrollment.progressPercentage || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

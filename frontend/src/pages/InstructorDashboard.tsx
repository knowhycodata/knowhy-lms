import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, Play, Plus, Edit, Eye, BarChart3, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Progress } from '../components/ui/progress'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail: string | null
  isPublished: boolean
  _count: {
    enrollments: number
    modules: number
  }
  modules: Array<{
    _count: { lessons: number }
  }>
}

interface CourseStats {
  courseId: string
  enrollmentCount: number
  completedCount: number
  completionRate: number
  totalLessons: number
}

export default function InstructorDashboard() {
  const { user } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, CourseStats>>({})

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      // Tek istekte kursları ve istatistikleri çek
      const [coursesResponse, summaryResponse] = await Promise.all([
        api.get('/courses'),
        api.get('/analytics/instructor/summary')
      ])

      const myCourses = coursesResponse.data.data.filter((c: Course & { instructorId: string }) =>
        c.instructorId === user?.id || user?.role === 'ADMIN'
      )
      setCourses(myCourses)

      // Özet istatistiklerden kurs bazlı stats oluştur
      const summaryData = summaryResponse.data.data
      if (summaryData?.courses) {
        const statsMap: Record<string, CourseStats> = {}
        for (const courseStat of summaryData.courses) {
          statsMap[courseStat.courseId] = {
            courseId: courseStat.courseId,
            enrollmentCount: courseStat.enrollmentCount,
            completedCount: courseStat.studentsCompleted,
            completionRate: courseStat.completionRate,
            totalLessons: courseStat.totalLessons,
          }
        }
        setStats(statsMap)
      }
    } catch (error) {
      console.error('Kurslar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (courseId: string, currentStatus: boolean) => {
    try {
      await api.put(`/courses/${courseId}`, { isPublished: !currentStatus })
      loadCourses()
    } catch (error) {
      console.error('Yayın durumu değiştirilemedi:', error)
    }
  }

  const totalStudents = courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0)
  const totalLessons = courses.reduce((acc, c) =>
    acc + c.modules.reduce((m, mod) => m + (mod._count?.lessons || 0), 0), 0
  )
  const publishedCourses = courses.filter(c => c.isPublished).length

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
          <h1 className="text-3xl font-bold">Eğitmen Paneli</h1>
          <p className="text-muted-foreground">Kurslarınızı yönetin ve öğrenci ilerlemesini takip edin</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kurs Oluştur
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kurs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCourses} yayında
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Kayıtlı öğrenci
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ders</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Video içeriği
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ort. Tamamlama</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.length > 0
                ? Math.round(Object.values(stats).reduce((a, s) => a + (s?.completionRate || 0), 0) / courses.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Kurs tamamlama oranı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle>Kurslarım</CardTitle>
          <CardDescription>Oluşturduğunuz tüm kurslar</CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Henüz kurs oluşturmadınız</h3>
              <p className="text-muted-foreground mb-4">İlk kursunuzu oluşturarak başlayın</p>
              <Link to="/instructor/courses/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Kurs Oluştur
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                const courseStats = stats[course.id]
                return (
                  <div key={course.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Thumbnail */}
                    <div className="w-32 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {course.thumbnail ? (
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{course.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${course.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {course.isPublished ? 'Yayında' : 'Taslak'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {course.description || 'Açıklama yok'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course._count?.enrollments || 0} öğrenci
                        </span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {course.modules.reduce((a, m) => a + (m._count?.lessons || 0), 0)} ders
                        </span>
                        {courseStats && (
                          <span className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" />
                            %{Math.round(courseStats.completionRate)} tamamlama
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {courseStats && courseStats.enrollmentCount > 0 && (
                      <div className="w-32 hidden md:block">
                        <div className="text-xs text-muted-foreground mb-1">Tamamlama</div>
                        <Progress value={courseStats.completionRate} className="h-2" />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link to={`/courses/${course.id}`}>
                        <Button variant="ghost" size="icon" title="Önizle">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/instructor/courses/${course.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Düzenle">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link to={`/instructor/courses/${course.id}/students`}>
                        <Button variant="ghost" size="icon" title="Öğrenciler">
                          <Users className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => togglePublish(course.id, course.isPublished)}
                      >
                        {course.isPublished ? 'Yayından Kaldır' : 'Yayınla'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Eğitmen İpuçları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600 mb-2" />
              <h4 className="font-medium text-blue-900">Kısa Videolar</h4>
              <p className="text-sm text-blue-700">5-15 dakikalık videolar öğrenci dikkatini daha iyi tutar.</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
              <h4 className="font-medium text-green-900">Düzenli İçerik</h4>
              <p className="text-sm text-green-700">Modülleri mantıklı bir sırayla düzenleyin.</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 mb-2" />
              <h4 className="font-medium text-purple-900">Etkileşim</h4>
              <p className="text-sm text-purple-700">Öğrenci yorumlarına yanıt verin.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

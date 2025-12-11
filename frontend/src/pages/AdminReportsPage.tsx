import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  BookOpen, 
  PlayCircle, 
  Clock, 
  TrendingUp, 
  Award,
  RefreshCw,
  Building2,
  UserCheck,
  UserX,
  Activity,
  Eye,
  Video
} from 'lucide-react'

interface ReportData {
  summary: {
    totalUsers: number
    activeUsers: number
    pendingUsers: number
    totalCourses: number
    publishedCourses: number
    totalLessons: number
    totalEnrollments: number
    completedEnrollments: number
    completionRate: number
    totalWatchHours: number
    weeklyEnrollments: number
    monthlyEnrollments: number
  }
  usersByRole: Record<string, number>
  usersByDepartment: { department: string; count: number }[]
  topCourses: { id: string; title: string; enrollments: number }[]
  recentEnrollments: {
    id: string
    enrolledAt: string
    user: { id: string; name: string; email: string; department?: string }
    course: { id: string; title: string }
  }[]
  recentProgress: {
    id: string
    updatedAt: string
    user: { id: string; name: string; department?: string }
    lesson: { id: string; title: string }
    totalWatchedSeconds: number
    isCompleted: boolean
  }[]
}

interface StudentReport {
  id: string
  name: string
  email: string
  department?: string
  joinedAt: string
  enrolledCourses: number
  completedCourses: number
  totalWatchedSeconds: number
  totalWatchedMinutes: number
  completedLessons: number
  totalLessonsStarted: number
  lastActivity: {
    lessonTitle: string
    courseTitle: string
    watchedSeconds: number
    updatedAt: string
  } | null
}

interface MostWatchedLesson {
  id: string
  title: string
  courseTitle: string
  courseId: string
  duration: number
  videoType: string
  totalViews: number
  uniqueViewers: number
  totalWatchedSeconds: number
  totalWatchedMinutes: number
  completions: number
  completionRate: number
  avgWatchTime: number
}

interface ActiveUser {
  id: string
  user: { id: string; name: string; email: string; department?: string }
  lesson: { id: string; title: string; courseTitle: string }
  lastWatchedSecond: number
  updatedAt: string
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [students, setStudents] = useState<StudentReport[]>([])
  const [mostWatched, setMostWatched] = useState<MostWatchedLesson[]>([])
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const fetchAllData = async () => {
    try {
      const [reportRes, studentsRes, watchedRes, activeRes] = await Promise.all([
        api.get('/analytics/report'),
        api.get('/analytics/students'),
        api.get('/analytics/most-watched?limit=15'),
        api.get('/analytics/active-users'),
      ])
      setReport(reportRes.data.data)
      setStudents(studentsRes.data.data)
      setMostWatched(watchedRes.data.data)
      setActiveUsers(activeRes.data.data)
    } catch (error) {
      console.error('Rapor yüklenemedi:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAllData()
    // Aktif kullanıcıları her 30 saniyede yenile
    const interval = setInterval(() => {
      api.get('/analytics/active-users').then(res => setActiveUsers(res.data.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAllData()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}s ${minutes}dk`
    return `${minutes}dk`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Rapor yüklenemedi</p>
        <Button onClick={handleRefresh} className="mt-4">Tekrar Dene</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detaylı Raporlar</h1>
          <p className="text-muted-foreground mt-1">Sistem genelinde istatistikler ve analizler</p>
        </div>
        <div className="flex items-center gap-4">
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">
              <Activity className="h-4 w-4 animate-pulse" />
              {activeUsers.length} aktif kullanıcı
            </div>
          )}
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="students">Öğrenci Raporları</TabsTrigger>
          <TabsTrigger value="videos">Video Analizleri</TabsTrigger>
          <TabsTrigger value="active">Aktif Kullanıcılar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalUsers}</div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-green-500" />
                {report.summary.activeUsers} aktif
              </span>
              <span className="flex items-center gap-1">
                <UserX className="h-3 w-3 text-orange-500" />
                {report.summary.pendingUsers} beklemede
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kurslar</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {report.summary.publishedCourses} yayında, {report.summary.totalLessons} ders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kayıtlar</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalEnrollments}</div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Bu hafta: {report.summary.weeklyEnrollments}</span>
              <span>Bu ay: {report.summary.monthlyEnrollments}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam İzleme</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalWatchHours} saat</div>
            <p className="text-xs text-muted-foreground mt-2">
              Tamamlama oranı: %{report.summary.completionRate}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* İkinci Satır */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Rol Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rol Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Admin</span>
                <span className="font-semibold">{report.usersByRole.ADMIN || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Eğitmen</span>
                <span className="font-semibold">{report.usersByRole.INSTRUCTOR || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Öğrenci</span>
                <span className="font-semibold">{report.usersByRole.STUDENT || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Departman Dağılımı */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departman Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {report.usersByDepartment.length > 0 ? (
                report.usersByDepartment.map((dept, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm truncate">{dept.department}</span>
                    <span className="font-semibold">{dept.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Departman verisi yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* En Popüler Kurslar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5" />
              En Popüler Kurslar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.topCourses.length > 0 ? (
                report.topCourses.map((course, i) => (
                  <div key={course.id} className="flex justify-between items-center">
                    <span className="text-sm truncate flex items-center gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      {course.title}
                    </span>
                    <span className="font-semibold text-sm">{course.enrollments} kayıt</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Henüz kurs yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Son Aktiviteler */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Son Kayıtlar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Son Kayıtlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {report.recentEnrollments.length > 0 ? (
                report.recentEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{enrollment.user.name}</p>
                        <p className="text-xs text-muted-foreground">{enrollment.course.title}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(enrollment.enrolledAt)}
                      </span>
                    </div>
                    {enrollment.user.department && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">
                        {enrollment.user.department}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Henüz kayıt yok</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Son İzleme Aktiviteleri */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Son İzleme Aktiviteleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {report.recentProgress.length > 0 ? (
                report.recentProgress.map((progress) => (
                  <div key={progress.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{progress.user.name}</p>
                        <p className="text-xs text-muted-foreground">{progress.lesson.title}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">
                          {formatDate(progress.updatedAt)}
                        </span>
                        <span className="text-xs">
                          {formatDuration(progress.totalWatchedSeconds)}
                          {progress.isCompleted && (
                            <span className="ml-1 text-green-500">✓</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        {/* Öğrenci Raporları Tab */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Öğrenci Detaylı Raporları ({students.length} öğrenci)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Öğrenci</th>
                      <th className="text-left py-3 px-2">Departman</th>
                      <th className="text-center py-3 px-2">Kayıtlı Kurs</th>
                      <th className="text-center py-3 px-2">Tamamlanan</th>
                      <th className="text-center py-3 px-2">İzleme Süresi</th>
                      <th className="text-left py-3 px-2">Son Aktivite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">{student.department || '-'}</td>
                        <td className="text-center py-3 px-2">{student.enrolledCourses}</td>
                        <td className="text-center py-3 px-2">
                          <span className="text-green-600">{student.completedLessons}</span>
                          <span className="text-muted-foreground">/{student.totalLessonsStarted}</span>
                        </td>
                        <td className="text-center py-3 px-2">{student.totalWatchedMinutes} dk</td>
                        <td className="py-3 px-2">
                          {student.lastActivity ? (
                            <div>
                              <p className="text-xs font-medium truncate max-w-[200px]">{student.lastActivity.lessonTitle}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(student.lastActivity.updatedAt)}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {students.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">Henüz öğrenci yok</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Analizleri Tab */}
        <TabsContent value="videos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                En Çok İzlenen Videolar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mostWatched.map((lesson, index) => (
                  <div key={lesson.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-sm text-muted-foreground">{lesson.courseTitle}</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center text-sm">
                      <div>
                        <p className="font-semibold">{lesson.uniqueViewers}</p>
                        <p className="text-xs text-muted-foreground">İzleyici</p>
                      </div>
                      <div>
                        <p className="font-semibold">{lesson.totalWatchedMinutes} dk</p>
                        <p className="text-xs text-muted-foreground">Toplam</p>
                      </div>
                      <div>
                        <p className="font-semibold">{lesson.completions}</p>
                        <p className="text-xs text-muted-foreground">Tamamlama</p>
                      </div>
                      <div>
                        <p className="font-semibold">%{lesson.completionRate}</p>
                        <p className="text-xs text-muted-foreground">Oran</p>
                      </div>
                    </div>
                  </div>
                ))}
                {mostWatched.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">Henüz video izlenmemiş</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aktif Kullanıcılar Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Şu An İzleyenler (Son 5 dakika)
                {activeUsers.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {activeUsers.length} aktif
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsers.length > 0 ? (
                <div className="space-y-3">
                  {activeUsers.map((active) => (
                    <div key={active.id} className="flex items-center gap-4 p-3 border rounded-lg bg-green-50">
                      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{active.user.name}</p>
                        <p className="text-sm text-muted-foreground">{active.user.email}</p>
                        {active.user.department && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">{active.user.department}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{active.lesson.title}</p>
                        <p className="text-xs text-muted-foreground">{active.lesson.courseTitle}</p>
                        <p className="text-xs text-green-600 mt-1">
                          {formatDuration(active.lastWatchedSecond)} izlendi
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Şu an aktif izleyen yok</p>
                  <p className="text-sm text-muted-foreground mt-1">Son 5 dakika içinde video izleyen kullanıcı bulunmuyor</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

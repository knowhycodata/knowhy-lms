import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { coursesApi, progressApi } from '../lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, Play, ChevronRight, ChevronLeft, Trash2, Edit } from 'lucide-react'
import { formatDuration } from '../lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Lesson {
  id: string
  title: string
  description?: string
  order: number
  videoType: 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE'
  duration: number
  thumbnailUrl?: string
}

interface Module {
  id: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
}

interface Course {
  id: string
  title: string
  description?: string
  thumbnail?: string
  instructor: {
    id: string
    name: string
    avatar?: string
  }
  modules: Module[]
  _count: { enrollments: number }
}

interface CourseProgress {
  progressPercentage: number
  completedLessons: number
  totalLessons: number
  lastWatchedLessonId: string | null
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return
      try {
        const [courseRes, progressRes] = await Promise.all([
          coursesApi.getById(courseId),
          progressApi.getCourseProgress(courseId)
        ])
        setCourse(courseRes.data.data)
        setProgress(progressRes.data.data)
      } catch (error) {
        console.error('Kurs verileri yüklenemedi:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kurs bulunamadı</p>
      </div>
    )
  }

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0)
  const totalDuration = course.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + (l.duration || 0), 0),
    0
  )

  const handleDelete = async () => {
    if (!courseId) return
    try {
      await coursesApi.delete(courseId)
      window.location.href = '/courses'
    } catch (error) {
      console.error('Kurs silinemedi:', error)
    }
  }

  // Kursu düzenleme veya silme yetkisi var mı?
  const canManageCourse = () => {
    if (!user || !course) return false
    return user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && course.instructor.id === user.id)
  }

  // İlk dersin ID'sini bul (Devam Et butonu için fallback)
  const getFirstLessonId = () => {
    for (const module of course.modules) {
      if (module.lessons.length > 0) {
        return module.lessons[0].id
      }
    }
    return null
  }

  const firstLessonId = getFirstLessonId()
  const continueLessonId = progress?.lastWatchedLessonId || firstLessonId
  const progressPercent = progress?.progressPercentage || 0
  const isStarted = progressPercent > 0 || !!progress?.lastWatchedLessonId

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link to="/courses">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground mt-1">{course.description}</p>
            )}
          </div>
          {canManageCourse() && (
            <div className="flex gap-2 mt-4">
              <Link to={`/instructor/courses/${course.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Sil
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kursu silmek istediğinizden emin misiniz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{course.title}" kursunu silmek, kursa ait tüm modülleri, dersleri ve kayıtları kalıcı olarak kaldıracaktır. Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sil
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* Course Info */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {totalLessons} ders
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(totalDuration)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <span className="text-muted-foreground">Eğitmen: </span>
            <span className="font-medium">{course.instructor.name}</span>
          </div>
        </div>
        <div className="w-full md:w-80">
          <Card>
            <CardContent className="p-4">
              <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">İlerleme</span>
                  <span>%{progressPercent}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                {continueLessonId ? (
                  <Link to={`/lessons/${continueLessonId}`}>
                    <Button className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      {isStarted ? 'Devam Et' : 'Kursa Başla'}
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled>
                    <Play className="h-4 w-4 mr-2" />
                    Ders Yok
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modules - Kompakt Tasarım */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Müfredat</h2>
        <div className="space-y-2">
          {course.modules.map((module) => (
            <div key={module.id} className="border rounded-lg overflow-hidden bg-card">
              {/* Modül Başlığı */}
              <div className="px-4 py-3 bg-muted/30 border-b">
                <h3 className="font-medium text-base">{module.title}</h3>
                {module.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
                )}
              </div>

              {/* Dersler */}
              <div className="divide-y">
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lessons/${lesson.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    {/* Thumbnail veya Play ikonu */}
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {lesson.thumbnailUrl ? (
                        <img src={lesson.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    {/* Ders Bilgileri */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lesson.title || '(Başlıksız Ders)'}</p>
                      {lesson.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{lesson.description}</p>
                      )}
                    </div>

                    {/* Süre */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(lesson.duration)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}

                {module.lessons.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                    Bu modülde henüz ders yok
                  </div>
                )}
              </div>
            </div>
          ))}

          {course.modules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg">
              Bu kursta henüz modül yok
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

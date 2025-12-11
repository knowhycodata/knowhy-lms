import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { progressApi, lessonsApi } from '../lib/api'
import VideoPlayer from '../components/VideoPlayer'
import CommentSection from '../components/CommentSection'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface LessonData {
  id: string
  title: string
  description?: string
  videoType: 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE'
  videoUrl: string
  duration: number
  module: {
    id: string
    title: string
    course: {
      id: string
      title: string
      instructorId: string
    }
  }
}

interface ProgressData {
  lastWatchedSecond: number
  totalWatchedSeconds: number
  isCompleted: boolean
}

interface NavigationData {
  previous: { id: string; title: string; moduleId: string } | null
  next: { id: string; title: string; moduleId: string } | null
  current: { id: string; title: string; module: any }
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [navigation, setNavigation] = useState<NavigationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!lessonId) return
      try {
        // Lesson detayini getir
        const lessonRes = await lessonsApi.get(lessonId)
        setLesson(lessonRes.data.data)

        // Progress'i getir
        try {
          const progressRes = await progressApi.get(lessonId)
          setProgress(progressRes.data.data)
        } catch (e) {
          // Progress yoksa null kalabilir
          console.log('Progress kaydi bulunamadi')
        }

        // Navigasyonu getir
        try {
          const navRes = await lessonsApi.getNavigation(lessonId)
          setNavigation(navRes.data.data)
        } catch (e) {
          console.log('Navigasyon alinamadi')
        }
      } catch (error: any) {
        // 403 Forbidden - kursa kayıtlı değil
        if (error.response?.status === 403) {
          setAccessDenied(true)
        } else {
          console.error('Ders yüklenemedi:', error)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lessonId])

  const handleProgressUpdate = (seconds: number) => {
    setProgress((prev) => prev ? { ...prev, lastWatchedSecond: seconds } : null)
    setCurrentTimestamp(seconds)
  }

  // Yorumdaki zaman damgasına tıklandığında videoya git
  const handleTimestampClick = (seconds: number) => {
    // Video elementine erişip seek yapacağız
    const videoElement = document.querySelector('video')
    if (videoElement) {
      videoElement.currentTime = seconds
      videoElement.play()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-orange-100 flex items-center justify-center">
          <ChevronLeft className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-xl font-semibold">Bu Derse Erişiminiz Yok</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Bu dersi izleyebilmek için önce kursa kayıt olmanız gerekmektedir.
        </p>
        <Button onClick={() => window.history.back()}>Geri Dön</Button>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Ders bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link to={`/courses/${lesson.module.course.id}`}>
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{lesson.title || '(Başlıksız Ders)'}</h1>
          {lesson.description && (
            <p className="text-muted-foreground mt-1">{lesson.description}</p>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/courses" className="hover:text-foreground">
          Kurslar
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          to={`/courses/${lesson.module.course.id}`}
          className="hover:text-foreground"
        >
          {lesson.module.course.title}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span>{lesson.module.title}</span>
      </div>

      {/* Video Player */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayer
            lessonId={lesson.id}
            videoType={lesson.videoType}
            videoUrl={lesson.videoUrl}
            initialProgress={progress?.lastWatchedSecond || 0}
            onProgressUpdate={handleProgressUpdate}
            onTimeClick={(seconds) => setCurrentTimestamp(seconds)}
          />

          {/* Yorumlar */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <CommentSection
                lessonId={lesson.id}
                courseInstructorId={lesson.module.course.instructorId}
                currentTimestamp={currentTimestamp}
                onTimestampClick={handleTimestampClick}
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              disabled={!navigation?.previous}
              asChild={!!navigation?.previous}
            >
              {navigation?.previous ? (
                <Link to={`/lessons/${navigation.previous.id}`}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Önceki Ders
                </Link>
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Önceki Ders
                </>
              )}
            </Button>
            <Button
              disabled={!navigation?.next}
              asChild={!!navigation?.next}
            >
              {navigation?.next ? (
                <Link to={`/lessons/${navigation.next.id}`}>
                  Sonraki Ders
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              ) : (
                <>
                  Sonraki Ders
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">İlerleme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kaldığın yer</span>
                  <span>{Math.floor((progress?.lastWatchedSecond || 0) / 60)} dk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam izleme</span>
                  <span>{Math.floor((progress?.totalWatchedSeconds || 0) / 60)} dk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durum</span>
                  <span className={progress?.isCompleted ? 'text-green-600' : 'text-yellow-600'}>
                    {progress?.isCompleted ? 'Tamamlandı' : 'Devam ediyor'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ekler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-4">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Henüz ek dosya yok
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { coursesApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, Trash2, Edit, Check, Loader2 } from 'lucide-react'
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

interface Course {
  id: string
  title: string
  description?: string
  thumbnail?: string
  instructor: {
    id: string
    name: string
  }
  modules: { id: string; _count: { lessons: number } }[]
  _count: { enrollments: number }
  isEnrolled?: boolean
  enrolledAt?: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  const fetchCourses = async () => {
    try {
      const response = await coursesApi.getAll({ isPublished: true })
      setCourses(response.data.data || [])
    } catch (error) {
      console.error('Kurslar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  const handleDelete = async (courseId: string) => {
    try {
      await coursesApi.delete(courseId)
      await fetchCourses()
    } catch (error) {
      console.error('Kurs silinemedi:', error)
    }
  }

  // Kursu düzenleme veya silme yetkisi var mı?
  const canManageCourse = (course: Course) => {
    if (!user) return false
    return user.role === 'ADMIN' || (user.role === 'INSTRUCTOR' && course.instructor.id === user.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Öğrenci için mesaj
  const isStudent = user?.role === 'STUDENT'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isStudent ? 'Kurslarım' : 'Kurslar'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isStudent
            ? 'Size atanan eğitim kursları'
            : 'Tüm eğitim kurslarını yönetin'
          }
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {isStudent
                ? 'Henüz size atanmış kurs bulunmuyor. Eğitmeniniz sizi kurslara ekleyecektir.'
                : 'Henüz yayınlanmış kurs bulunmuyor'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const totalLessons = course.modules.reduce(
              (acc, m) => acc + m._count.lessons,
              0
            )

            return (
              <Card key={course.id} className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
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
                  {/* Kayıtlı badge */}
                  {course.isEnrolled && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Kayıtlı
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {totalLessons} ders
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course._count.enrollments} kayıt
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {course.instructor.name}
                    </span>
                    <div className="flex gap-2">
                      {canManageCourse(course) && (
                        <>
                          <Link to={`/instructor/courses/${course.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
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
                                  onClick={() => handleDelete(course.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Sil
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {/* Öğrenci için kayıt butonu gösterme - artık sadece atanan kursları görüyor */}
                      <Link to={`/courses/${course.id}`}>
                        <Button size="sm">
                          {course.isEnrolled ? 'Devam Et' : 'Detay'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

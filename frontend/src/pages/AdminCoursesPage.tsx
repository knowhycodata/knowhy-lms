import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus, Edit, Trash2, Users, Eye, EyeOff, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { api } from '../lib/api'
import { showToast } from '../lib/toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface Course {
  id: string
  title: string
  description?: string
  thumbnail?: string
  isPublished: boolean
  createdAt: string
  instructor: {
    id: string
    name: string
    email: string
  }
  _count?: {
    modules: number
    enrollments: number
  }
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      // Admin tüm kursları görebilmeli - isPublished parametresi olmadan
      const response = await api.get('/courses', {
        params: { limit: 100 }
      })
      setCourses(response.data.data || [])
    } catch (error) {
      console.error('Kurslar yüklenemedi:', error)
      showToast.error('Kurslar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`"${courseTitle}" kursunu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    try {
      await api.delete(`/courses/${courseId}`)
      showToast.success('Kurs başarıyla silindi')
      loadCourses()
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Kurs silinirken hata oluştu')
    }
  }

  const handleTogglePublish = async (course: Course) => {
    try {
      await api.put(`/courses/${course.id}`, {
        isPublished: !course.isPublished
      })
      showToast.success(course.isPublished ? 'Kurs taslağa alındı' : 'Kurs yayınlandı')
      loadCourses()
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'İşlem başarısız')
    }
  }

  // Filtreleme
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterPublished === 'all' ||
      (filterPublished === 'published' && course.isPublished) ||
      (filterPublished === 'draft' && !course.isPublished)

    return matchesSearch && matchesFilter
  })

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
          <h1 className="text-3xl font-bold">Kurs Yönetimi</h1>
          <p className="text-muted-foreground">Tüm kursları görüntüleyin ve yönetin</p>
        </div>
        <Link to="/instructor/courses/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kurs
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Kurs veya eğitmen ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterPublished === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPublished('all')}
              >
                Tümü ({courses.length})
              </Button>
              <Button
                variant={filterPublished === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPublished('published')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Yayında ({courses.filter(c => c.isPublished).length})
              </Button>
              <Button
                variant={filterPublished === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterPublished('draft')}
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Taslak ({courses.filter(c => !c.isPublished).length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Kurslar ({filteredCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Henüz kurs bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail.startsWith('/') ? `${API_URL.replace('/api', '')}${course.thumbnail}` : course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{course.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        course.isPublished 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {course.isPublished ? 'Yayında' : 'Taslak'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Eğitmen: {course.instructor.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{course._count?.modules || 0} modül</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {course._count?.enrollments || 0} kayıt
                      </span>
                      <span>{new Date(course.createdAt).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTogglePublish(course)}
                      title={course.isPublished ? 'Taslağa Al' : 'Yayınla'}
                    >
                      {course.isPublished ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Link to={`/instructor/courses/${course.id}/students`}>
                      <Button variant="ghost" size="icon" title="Öğrenciler">
                        <Users className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link to={`/instructor/courses/${course.id}/edit`}>
                      <Button variant="ghost" size="icon" title="Düzenle">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(course.id, course.title)}
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Users, Search, UserPlus, Trash2, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { api } from '../lib/api'
import { showToast } from '../lib/toast'

interface Enrollment {
  id: string
  enrolledAt: string
  completedAt: string | null
  user: {
    id: string
    name: string
    email: string
    department: string | null
  }
}

interface Course {
  id: string
  title: string
  _count: {
    enrollments: number
  }
}

interface AvailableUser {
  id: string
  name: string
  email: string
  department: string | null
}

export default function InstructorStudentsPage() {
  const { courseId } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  useEffect(() => {
    if (courseId) {
      loadData()
    }
  }, [courseId])

  // Kullanici arama - debounce ile
  useEffect(() => {
    if (searchQuery.length < 2) {
      setAvailableUsers([])
      return
    }
    const timer = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchUsers = async (query: string) => {
    setSearchingUsers(true)
    try {
      const res = await api.get(`/users?search=${query}&role=STUDENT`)
      const users = res.data.users || []
      // Zaten kayitli olanlari filtrele
      const enrolledIds = enrollments.map(e => e.user.id)
      setAvailableUsers(users.filter((u: AvailableUser) => !enrolledIds.includes(u.id)))
    } catch (e) {
      console.error(e)
    } finally {
      setSearchingUsers(false)
    }
  }

  const loadData = async () => {
    try {
      const [courseRes, enrollmentsRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/courses/${courseId}/enrollments`),
      ])
      setCourse(courseRes.data.data)
      setEnrollments(enrollmentsRes.data.data || [])
    } catch (error) {
      console.error('Veriler yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (userId: string) => {
    try {
      await api.post(`/courses/${courseId}/enroll`, { userId })
      setShowAddModal(false)
      setSearchQuery('')
      setAvailableUsers([])
      loadData()
    } catch (error) {
      console.error('Ogrenci eklenemedi:', error)
      showToast.error('Öğrenci eklenirken bir hata oluştu')
    }
  }

  const handleRemoveStudent = async (enrollmentId: string) => {
    if (!confirm('Bu öğrenciyi kurstan çıkarmak istediğinize emin misiniz?')) return
    try {
      await api.delete(`/courses/enrollments/${enrollmentId}`)
      loadData()
    } catch (error) {
      console.error('Öğrenci çıkarılamadı:', error)
    }
  }

  const filteredEnrollments = enrollments.filter(e =>
    e.user.name.toLowerCase().includes(search.toLowerCase()) ||
    e.user.email.toLowerCase().includes(search.toLowerCase())
  )

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
        <div className="flex items-center gap-4">
          <Link to="/instructor">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Öğrenci Yönetimi</h1>
            <p className="text-muted-foreground">{course?.title}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Öğrenci Ekle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Öğrenci</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlayan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.filter(e => e.completedAt).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devam Eden</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollments.filter(e => !e.completedAt).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="İsim veya email ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Kayıtlı Öğrenciler</CardTitle>
          <CardDescription>{filteredEnrollments.length} öğrenci listeleniyor</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Bu kursta henüz öğrenci yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {enrollment.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{enrollment.user.name}</p>
                      <p className="text-sm text-muted-foreground">{enrollment.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        {enrollment.completedAt ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Tamamlandı
                          </span>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Devam ediyor
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kayıt: {new Date(enrollment.enrolledAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStudent(enrollment.id)}
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Ogrenci Ekle</CardTitle>
              <CardDescription>Isim veya email yazarak ogrenci arayin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Isim veya email yazin..."
                    className="pl-10"
                    autoFocus
                  />
                </div>
                
                {searchingUsers && (
                  <p className="text-sm text-muted-foreground text-center">Araniyor...</p>
                )}
                
                {availableUsers.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button size="sm" onClick={() => handleAddStudent(user.id)}>
                          Ekle
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && availableUsers.length === 0 && !searchingUsers && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sonuc bulunamadi
                  </p>
                )}
                
                {searchQuery.length < 2 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    En az 2 karakter yazin
                  </p>
                )}
                
                <Button variant="outline" onClick={() => { setShowAddModal(false); setSearchQuery(''); setAvailableUsers([]) }} className="w-full">
                  Kapat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

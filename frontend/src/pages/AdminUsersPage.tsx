import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, UserPlus, Edit, Trash2, Shield, GraduationCap, Users, Search, AlertCircle, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { api } from '../lib/api'
import { showToast } from '../lib/toast'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  department: string | null
  isActive: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

const roleLabels = {
  ADMIN: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: Shield },
  INSTRUCTOR: { label: 'Eğitmen', color: 'bg-green-100 text-green-700', icon: Users },
  STUDENT: { label: 'Öğrenci', color: 'bg-blue-100 text-blue-700', icon: GraduationCap },
}

const statusLabels: Record<User['status'], { label: string; color: string }> = {
  PENDING: { label: 'Onay Bekliyor', color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Onaylı', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-700' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'ADMIN' | 'INSTRUCTOR' | 'STUDENT',
    department: '',
  })
  // Şifre değiştirme modal state'leri
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.append('role', roleFilter)
      const response = await api.get(`/users?${params.toString()}`)
      const data = response.data
      const users = data.users || data.data?.users || []
      setUsers(users)
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error)
      showToast.error('Kullanıcılar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData)
      } else {
        await api.post('/auth/register', formData)
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', role: 'STUDENT', department: '' })
      loadUsers()
      showToast.success(editingUser ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
    } catch (error) {
      console.error('İşlem başarısız:', error)
      showToast.error('İşlem başarısız')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      department: user.department || '',
    })
    setShowModal(true)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/users/${userId}`, { isActive: !currentStatus })
      loadUsers()
    } catch (error) {
      console.error('Durum degistirme basarisiz:', error)
      showToast.error('Durum değiştirme başarısız')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return
    try {
      await api.delete(`/users/${userId}`)
      loadUsers()
      showToast.success('Kullanıcı silindi')
    } catch (error) {
      console.error('Silme başarısız:', error)
      showToast.error('Silme başarısız')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      loadUsers()
    } catch (error) {
      console.error('Rol değiştirme başarısız:', error)
      showToast.error('Rol değiştirme başarısız')
    }
  }

  const handleStatusChange = async (userId: string, status: User['status']) => {
    try {
      await api.patch(`/users/${userId}/status`, { status })
      loadUsers()
    } catch (error) {
      console.error('Onay durumu değiştirme başarısız:', error)
      showToast.error('Onay durumu değiştirme başarısız')
    }
  }

  const openPasswordModal = (user: User) => {
    setPasswordUser(user)
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser) return

    if (newPassword.length < 6) {
      showToast.warning('Şifre en az 6 karakter olmalıdır')
      return
    }

    try {
      await api.patch(`/users/${passwordUser.id}/password`, { password: newPassword })
      showToast.success('Şifre başarıyla güncellendi!')
      setShowPasswordModal(false)
      setPasswordUser(null)
      setNewPassword('')
    } catch (error: any) {
      showToast.error(error.response?.data?.error || 'Şifre değiştirme başarısız')
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
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
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
            <p className="text-muted-foreground">Tüm kullanıcıları görüntüle ve yönet</p>
          </div>
        </div>
        <Button onClick={() => { setEditingUser(null); setShowModal(true); }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İsim veya email ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="">Tüm Roller</option>
              <option value="ADMIN">Admin</option>
              <option value="INSTRUCTOR">Eğitmen</option>
              <option value="STUDENT">Öğrenci</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcılar ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Kullanıcı</th>
                  <th className="text-left py-3 px-4 font-medium">Rol</th>
                  <th className="text-left py-3 px-4 font-medium">Departman</th>
                  <th className="text-left py-3 px-4 font-medium">Onay Durumu</th>
                  <th className="text-left py-3 px-4 font-medium">Kayıt Tarihi</th>
                  <th className="text-right py-3 px-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const roleInfo = roleLabels[user.role]
                  return (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${roleInfo.color}`}>
                            <roleInfo.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`px-2 py-1 rounded text-sm ${roleInfo.color}`}
                        >
                          <option value="STUDENT">Öğrenci</option>
                          <option value="INSTRUCTOR">Eğitmen</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {user.department || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${statusLabels[user.status].color}`}>
                              <AlertCircle className="w-3 h-3" />
                              {statusLabels[user.status].label}
                            </span>
                            {user.status === 'PENDING' && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(user.id, 'APPROVED')}
                                >
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusChange(user.id, 'REJECTED')}
                                >
                                  Reddet
                                </Button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.isActive)}
                            className={`self-start px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                          >
                            {user.isActive ? 'Aktif' : 'Pasif'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openPasswordModal(user)} title="Şifre Değiştir">
                            <Key className="w-4 h-4 text-amber-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Düzenle">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)} title="Sil">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Ad Soyad</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                {!editingUser && (
                  <div>
                    <label className="text-sm font-medium">Şifre</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Rol</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="STUDENT">Öğrenci</option>
                    <option value="INSTRUCTOR">Eğitmen</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Departman</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    İptal
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingUser ? 'Güncelle' : 'Oluştur'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Şifre Değiştirme Modal */}
      {showPasswordModal && passwordUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Şifre Değiştir
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {passwordUser.name} ({passwordUser.email}) için yeni şifre belirleyin
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Yeni Şifre</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordModal(false)
                      setPasswordUser(null)
                    }}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                  <Button type="submit" className="flex-1">
                    Şifreyi Güncelle
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

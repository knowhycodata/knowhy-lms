import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Building2, Shield, Camera, Lock, Save } from 'lucide-react'
import { showToast } from '@/lib/toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface UserProfile {
    id: string
    name: string
    email: string
    department?: string
    avatar?: string
    role: string
    createdAt: string
}

export default function ProfilePage() {
    const { user, setUser } = useAuthStore()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [department, setDepartment] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')

    // Password form
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const response = await api.get('/auth/me')
            const userData = response.data.data
            setProfile(userData)
            setName(userData.name || '')
            setDepartment(userData.department || '')
            setAvatarUrl(userData.avatar || '')
        } catch (error) {
            console.error('Profil yüklenemedi:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveProfile = async () => {
        if (!profile) return

        setSaving(true)

        try {
            const response = await api.put(`/users/${profile.id}`, {
                name,
                department,
                avatar: avatarUrl,
            })

            setProfile(response.data.data)

            // Auth store'u güncelle
            if (user) {
                setUser({
                    ...user,
                    name,
                    avatar: avatarUrl,
                })
            }

            showToast.success('Profil başarıyla güncellendi')
        } catch (error: any) {
            showToast.error(error.response?.data?.error || 'Profil güncellenemedi')
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        if (!profile) return

        if (newPassword !== confirmPassword) {
            showToast.warning('Yeni şifreler eşleşmiyor')
            return
        }

        if (newPassword.length < 8) {
            showToast.warning('Şifre en az 8 karakter olmalı')
            return
        }

        // Güçlü şifre kontrolü
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        if (!passwordRegex.test(newPassword)) {
            showToast.warning('Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir')
            return
        }

        setChangingPassword(true)

        try {
            await api.patch(`/users/${profile.id}/password`, {
                currentPassword,
                password: newPassword,
            })

            showToast.success('Şifre başarıyla değiştirildi')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            showToast.error(error.response?.data?.error || 'Şifre değiştirilemedi')
        } finally {
            setChangingPassword(false)
        }
    }

    const handleAvatarUpload = async (file: File) => {
        try {
            const formData = new FormData()
            formData.append('avatar', file)

            const token = localStorage.getItem('token')
            const response = await fetch(`${API_URL}/upload/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            })

            const data = await response.json()
            if (data.success) {
                setAvatarUrl(data.data.url)
                showToast.info('Profil fotoğrafı yüklendi. Kaydetmeyi unutmayın!')
            } else {
                showToast.error('Yükleme hatası: ' + data.error)
            }
        } catch (error) {
            showToast.error('Fotoğraf yüklenirken hata oluştu')
        }
    }

    const getRoleName = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'Yönetici'
            case 'INSTRUCTOR': return 'Eğitmen'
            case 'STUDENT': return 'Öğrenci'
            default: return role
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
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Profil Ayarları</h1>
                <p className="text-muted-foreground mt-1">
                    Hesap bilgilerinizi buradan yönetebilirsiniz
                </p>
            </div>

            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Kişisel Bilgiler</CardTitle>
                    <CardDescription>Profil bilgilerinizi güncelleyin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl.startsWith('/') ? `${API_URL.replace('/api', '')}${avatarUrl}` : avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="h-12 w-12 text-primary" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                                <Camera className="h-4 w-4" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) handleAvatarUpload(file)
                                    }}
                                />
                            </label>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{profile?.name}</h3>
                            <p className="text-muted-foreground">{profile?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Shield className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{getRoleName(profile?.role || '')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <User className="w-4 h-4" /> İsim
                            </label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Adınız Soyadınız"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Mail className="w-4 h-4" /> E-posta
                            </label>
                            <Input
                                value={profile?.email || ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Departman
                            </label>
                            <Input
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                placeholder="Departman adı"
                            />
                        </div>
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </Button>
                </CardContent>
            </Card>

            {/* Password Change */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5" /> Şifre Değiştir
                    </CardTitle>
                    <CardDescription>Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Mevcut Şifre</label>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Yeni Şifre</label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-muted-foreground">
                                En az 8 karakter, bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        variant="outline"
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </Button>
                </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Hesap Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 text-sm">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Hesap ID</span>
                            <span className="font-mono text-xs">{profile?.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Hesap Türü</span>
                            <span>{getRoleName(profile?.role || '')}</span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">Kayıt Tarihi</span>
                            <span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('tr-TR') : '-'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, AlertTriangle } from 'lucide-react'
import { showToast } from '@/lib/toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { settings, fetchSettings, loading: settingsLoading } = useSettingsStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Sayfa yüklendiğinde ayarları getir
    fetchSettings()
  }, [fetchSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authApi.login(email, password)
      const { user, token } = response.data.data
      setAuth(user, token)
      showToast.success('Giriş başarılı!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      showToast.error(error.response?.data?.error || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {settings.siteName || (settingsLoading ? '...' : 'LMS')}
          </CardTitle>
          <CardDescription>
            {settings.siteDescription || (settingsLoading ? '' : 'Eğitim Platformu')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Bakım Modu Uyarısı */}
          {settings.maintenanceMode && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Bakım Modu Aktif</span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                {settings.maintenanceMessage || 'Sistem bakımdadır. Şu anda giriş yapılamamaktadır. Lütfen en kısa zaman da tekrar deneyiniz.'}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Şifre
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-primary hover:underline">
              Kayıt olun
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, Mail, User, Lock, Building, AlertCircle } from 'lucide-react'
import { showToast } from '@/lib/toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({})

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {}
    
    if (!name.trim() || name.length < 2) {
      errors.name = 'İsim en az 2 karakter olmalı'
    }
    
    if (!email.trim()) {
      errors.email = 'Email adresi gerekli'
    } else if (!validateEmail(email)) {
      errors.email = 'Geçerli bir email adresi giriniz (örn: kullanici@sirket.com)'
    }
    
    if (!password) {
      errors.password = 'Şifre gerekli'
    } else if (password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalı'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      await authApi.register({ name, email, password, department })
      showToast.success('Kayıt işleminiz alındı. Hesabınız yönetici onayından sonra aktif olacaktır.')
      // Kısa bir bilgilendirme süresi sonrası login sayfasına yönlendir
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      const errorMessage = error.response?.data?.error || 'Kayıt başarısız'
      
      // Backend'den gelen hatayı alan bazında göster
      if (errorMessage.includes('email')) {
        setFieldErrors({ email: errorMessage })
      } else if (errorMessage.includes('şifre') || errorMessage.includes('karakter')) {
        setFieldErrors({ password: errorMessage })
      } else if (errorMessage.includes('isim')) {
        setFieldErrors({ name: errorMessage })
      } else {
        showToast.error(errorMessage)
      }
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
          <CardTitle className="text-2xl">Kayıt Ol</CardTitle>
          <CardDescription>Eğitim platformuna katılın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Ad Soyad
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Adınız Soyadınız"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (fieldErrors.name) {
                    setFieldErrors(prev => ({ ...prev, name: '' }))
                  }
                }}
                className={fieldErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                required
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors(prev => ({ ...prev, email: '' }))
                  }
                }}
                className={fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                required
              />
              {fieldErrors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Departman
              </label>
              <Input
                id="department"
                type="text"
                placeholder="Yazılım, Pazarlama, vb."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Şifre
              </label>
              <Input
                id="password"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors(prev => ({ ...prev, password: '' }))
                  }
                }}
                className={fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''}
                required
                minLength={6}
              />
              {fieldErrors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldErrors.password}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Giriş yapın
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

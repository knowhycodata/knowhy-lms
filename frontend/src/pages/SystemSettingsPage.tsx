import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { 
  Settings, 
  Globe, 
  Shield, 
  Database, 
  Save,
  RefreshCw
} from 'lucide-react'
import { api } from '@/lib/api'
import { useSettingsStore } from '@/store/settings.store'
import { showToast } from '@/lib/toast'

interface SystemSettings {
  siteName: string
  siteDescription: string
  maintenanceMode: boolean
  maintenanceMessage: string
  maxFileSize: number
  maxVideoSize: number
  allowedVideoTypes: string[]
  allowedDocTypes: string[]
  passwordMinLength: number
  sessionTimeout: number
  allowRegistration: boolean
}

const DEFAULT_SETTINGS: SystemSettings = {
  siteName: 'Knowhy LMS',
  siteDescription: 'Şirket İçi Eğitim Platformu',
  maintenanceMode: false,
  maintenanceMessage: 'Sistem bakımda, lütfen daha sonra tekrar deneyin.',
  maxFileSize: 100,
  maxVideoSize: 500,
  allowedVideoTypes: ['mp4', 'webm', 'mov'],
  allowedDocTypes: ['pdf', 'docx', 'pptx', 'xlsx'],
  passwordMinLength: 6,
  sessionTimeout: 24,
  allowRegistration: true,
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/settings')
      if (response.data.data) {
        setSettings(response.data.data)
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put('/admin/settings', settings)
      showToast.success('Ayarlar başarıyla kaydedildi! Değişiklikler hemen uygulandı.')
      // Global store'u güncelle
      fetchSettings()
    } catch (error) {
      showToast.error('Ayarlar kaydedilemedi. Lütfen tekrar deneyin.')
    } finally {
      setSaving(false)
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Sistem Ayarları
          </h1>
          <p className="text-muted-foreground">Platformun genel ayarlarını yapılandırın</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Yenile
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Site Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Site Ayarları
          </CardTitle>
          <CardDescription>
            Site adı ve açıklaması tüm sayfalarda görünür
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Adı</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                placeholder="Knowhy LMS"
              />
              <p className="text-xs text-muted-foreground">
                Sidebar ve sayfa başlığında görünür
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Açıklaması</Label>
              <Input
                id="siteDescription"
                value={settings.siteDescription}
                onChange={(e) => setSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                placeholder="Şirket İçi Eğitim Platformu"
              />
            </div>
          </div>

          {/* Bakım Modu */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="maintenanceMode">Bakım Modu</Label>
                  {settings.maintenanceMode && (
                    <Badge variant="destructive">AKTİF</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Aktif olduğunda sadece adminler sisteme girebilir
                </p>
              </div>
              <Switch
                id="maintenanceMode"
                checked={settings.maintenanceMode}
                onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
              />
            </div>
            {settings.maintenanceMode && (
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Bakım Mesajı</Label>
                <Input
                  id="maintenanceMessage"
                  value={settings.maintenanceMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                  placeholder="Sistem bakımda..."
                />
              </div>
            )}
          </div>

          {/* Kayıt İzni */}
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="space-y-1">
              <Label htmlFor="allowRegistration">Yeni Kayıtlara İzin Ver</Label>
              <p className="text-sm text-muted-foreground">
                Kapalı olduğunda yeni kullanıcılar kayıt olamaz
              </p>
            </div>
            <Switch
              id="allowRegistration"
              checked={settings.allowRegistration}
              onCheckedChange={(checked: boolean) => setSettings(prev => ({ ...prev, allowRegistration: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Güvenlik Ayarları
          </CardTitle>
          <CardDescription>
            Şifre ve oturum güvenlik kuralları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Minimum Şifre Uzunluğu</Label>
              <Input
                id="passwordMinLength"
                type="number"
                min={4}
                max={32}
                value={settings.passwordMinLength}
                onChange={(e) => setSettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 6 }))}
              />
              <p className="text-xs text-muted-foreground">
                Yeni kayıtlarda ve şifre değişikliklerinde uygulanır
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Oturum Süresi (saat)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min={1}
                max={168}
                value={settings.sessionTimeout}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 24 }))}
              />
              <p className="text-xs text-muted-foreground">
                Bu süre sonunda kullanıcı tekrar giriş yapmalı
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dosya Yükleme Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dosya Yükleme Limitleri
          </CardTitle>
          <CardDescription>
            Video ve doküman yükleme sınırları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxVideoSize">Maks. Video Boyutu (MB)</Label>
              <Input
                id="maxVideoSize"
                type="number"
                min={1}
                max={2000}
                value={settings.maxVideoSize}
                onChange={(e) => setSettings(prev => ({ ...prev, maxVideoSize: parseInt(e.target.value) || 500 }))}
              />
              <p className="text-xs text-muted-foreground">
                Ders videoları için maksimum boyut
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxFileSize">Maks. Doküman Boyutu (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                min={1}
                max={1000}
                value={settings.maxFileSize}
                onChange={(e) => setSettings(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) || 100 }))}
              />
              <p className="text-xs text-muted-foreground">
                PDF, DOCX gibi ek dosyalar için
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>İzin Verilen Video Formatları</Label>
              <div className="flex flex-wrap gap-2">
                {settings.allowedVideoTypes.map((type) => (
                  <Badge key={type} variant="secondary">.{type}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>İzin Verilen Doküman Formatları</Label>
              <div className="flex flex-wrap gap-2">
                {settings.allowedDocTypes.map((type) => (
                  <Badge key={type} variant="secondary">.{type}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bilgi Notu */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
        <span className="text-blue-500">ℹ️</span>
        Ayarlar kaydedildiğinde hemen uygulanır. Site adı değişikliği için sayfayı yenilemeniz gerekebilir.
      </div>
    </div>
  )
}

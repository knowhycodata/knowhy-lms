import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Play, ChevronDown, ChevronRight, Youtube, Upload, Loader2, Video, X, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { api } from '../lib/api'
import { showToast } from '../lib/toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface Lesson {
  id?: string
  title: string
  description: string
  videoType: 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE'
  videoUrl: string
  duration: number
  thumbnailUrl?: string
}

interface Module {
  id?: string
  title: string
  description: string
  lessons: Lesson[]
  isOpen: boolean
}

export default function InstructorCourseForm() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!courseId

  const [saving, setSaving] = useState(false)
  const [course, setCourse] = useState({ title: '', description: '', thumbnail: '', isPublished: false })
  const [modules, setModules] = useState<Module[]>([])

  useEffect(() => {
    if (isEditing) loadCourse()
  }, [courseId])

  const loadCourse = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`)
      const d = res.data.data
      setCourse({ title: d.title, description: d.description || '', thumbnail: d.thumbnail || '', isPublished: d.isPublished })
      setModules(d.modules.map((m: any) => ({
        id: m.id, title: m.title, description: m.description || '', isOpen: false,
        lessons: m.lessons.map((l: any) => ({
          id: l.id, title: l.title, description: l.description || '',
          videoType: l.videoType, videoUrl: l.videoUrl, duration: l.duration || 0,
          thumbnailUrl: l.thumbnailUrl || ''
        }))
      })))
    } catch (e) { console.error(e) }
  }

  const handleSave = async () => {
    if (!course.title) { showToast.warning('Kurs başlığı gerekli'); return }

    // Ders validasyonu
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      if (!module.title.trim()) {
        showToast.warning(`${i + 1}. Modülün başlığı boş olamaz`);
        return;
      }
      for (let j = 0; j < module.lessons.length; j++) {
        const lesson = module.lessons[j];
        if (!lesson.title.trim()) {
          showToast.warning(`${module.title} modülündeki ${j + 1}. dersin başlığı boş olamaz`);
          // İlgili modülü aç
          const newModules = [...modules];
          newModules[i].isOpen = true;
          setModules(newModules);
          return;
        }
        // Video kontrolü
        if (!lesson.videoUrl.trim()) {
          showToast.warning(`${module.title} modülündeki "${lesson.title}" dersine video eklenmemiş`);
          const newModules = [...modules];
          newModules[i].isOpen = true;
          setModules(newModules);
          return;
        }
      }
    }

    setSaving(true)
    try {
      const modulesArray = Array.from(modules).map((m, mIndex) => ({
        id: m.id || undefined,
        title: m.title,
        description: m.description || undefined,
        order: mIndex,
        lessons: Array.from(m.lessons).map((l, lIndex) => ({
          id: l.id || undefined,
          title: l.title,
          description: l.description || undefined,
          videoType: l.videoType,
          videoUrl: l.videoUrl,
          duration: l.duration || 0,
          thumbnailUrl: l.thumbnailUrl || undefined,
          order: lIndex,
        })),
      }));

      const bulkData = {
        title: course.title,
        description: course.description || undefined,
        thumbnail: course.thumbnail || undefined,
        isPublished: course.isPublished,
        modules: modulesArray,
      };

      // Tek istekte tüm veriyi kaydet (Transaction ile atomic)
      if (isEditing) {
        await api.put(`/courses/bulk/${courseId}`, bulkData)
      } else {
        await api.post('/courses/bulk', bulkData)
      }

      navigate('/instructor')
    } catch (e: any) {
      console.error(e)
      const errorMessage = e.message || e.response?.data?.error || 'Kaydetme hatası oluştu'
      showToast.error(errorMessage)
    }
    finally { setSaving(false) }
  }

  const addModule = () => setModules([...modules, { title: '', description: '', lessons: [], isOpen: true }])

  const removeModule = async (i: number) => {
    const module = modules[i]
    if (!confirm('Modülü ve içindeki tüm dersleri silmek istediğinizden emin misiniz?')) return

    // Eğer modül veritabanında varsa API'dan sil
    if (module.id) {
      try {
        await api.delete(`/modules/${module.id}`)
      } catch (e) {
        console.error('Modül silinemedi:', e)
        showToast.error('Modül silinirken hata oluştu')
        return
      }
    }

    setModules(modules.filter((_, idx) => idx !== i))
  }
  const toggleModule = (i: number) => setModules(modules.map((m, idx) => idx === i ? { ...m, isOpen: !m.isOpen } : m))
  const updateModule = (i: number, field: string, val: string) => setModules(modules.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  const [uploading, setUploading] = useState<{ mi: number, li: number } | null>(null)
  const [editingLesson, setEditingLesson] = useState<{ mi: number, li: number } | null>(null)
  const [youtubeInput, setYoutubeInput] = useState('')
  const [fetchingDuration, setFetchingDuration] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // YouTube video süresini çek
  const fetchYouTubeDuration = async (videoId: string): Promise<number> => {
    try {
      // YouTube IFrame API ile süre çekme
      return new Promise((resolve) => {
        // Geçici bir container oluştur
        const container = document.createElement('div')
        container.style.display = 'none'
        container.id = 'yt-temp-player-' + Date.now()
        document.body.appendChild(container)

        // YouTube API yüklü mü kontrol et
        const createPlayer = () => {
          new window.YT.Player(container.id, {
            videoId: videoId,
            events: {
              onReady: (event: YT.PlayerEvent) => {
                const duration = Math.round(event.target.getDuration())
                event.target.destroy()
                container.remove()
                resolve(duration)
              },
              onError: () => {
                container.remove()
                resolve(0)
              }
            }
          })
        }

        if (window.YT && window.YT.Player) {
          createPlayer()
        } else {
          // YouTube API'yi yükle
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          const firstScript = document.getElementsByTagName('script')[0]
          firstScript.parentNode?.insertBefore(tag, firstScript)

          window.onYouTubeIframeAPIReady = () => {
            createPlayer()
          }
        }

        // 10 saniye sonra timeout
        setTimeout(() => {
          container.remove()
          resolve(0)
        }, 10000)
      })
    } catch (e) {
      console.error('YouTube süre çekme hatası:', e)
      return 0
    }
  }

  // Lokal video süresini hesapla
  const getLocalVideoDuration = async (videoUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration)
        video.remove()
        resolve(duration)
      }

      video.onerror = () => {
        video.remove()
        resolve(0)
      }

      // Video URL'sini oluştur
      const fullUrl = videoUrl.startsWith('/')
        ? `${API_URL.replace('/api', '')}${videoUrl}`
        : videoUrl
      video.src = fullUrl

      // 10 saniye sonra timeout
      setTimeout(() => {
        video.remove()
        resolve(0)
      }, 10000)
    })
  }

  const addLesson = (mi: number) => {
    const updated = [...modules]
    updated[mi].lessons.push({ title: '', description: '', videoType: 'VIDEO_YOUTUBE', videoUrl: '', duration: 0, thumbnailUrl: '' })
    updated[mi].isOpen = true
    setModules(updated)
  }
  const removeLesson = async (mi: number, li: number) => {
    const lesson = modules[mi].lessons[li]
    if (!confirm('Dersi silmek istediğinizden emin misiniz?')) return

    // Eğer ders veritabanında varsa API'dan sil
    if (lesson.id) {
      try {
        await api.delete(`/lessons/${lesson.id}`)
      } catch (e) {
        console.error('Ders silinemedi:', e)
        showToast.error('Ders silinirken hata oluştu')
        return
      }
    }

    const updated = [...modules]
    updated[mi].lessons = updated[mi].lessons.filter((_, idx) => idx !== li)
    setModules(updated)
  }
  const updateLesson = (mi: number, li: number, field: string, val: string | number) => {
    const updated = [...modules]
    updated[mi].lessons[li] = { ...updated[mi].lessons[li], [field]: val }
    setModules(updated)
  }

  const handleVideoUpload = async (mi: number, li: number, file: File) => {
    setUploading({ mi, li })
    try {
      const formData = new FormData()
      formData.append('video', file)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/upload/video`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        // Video süresini hesapla
        const duration = await getLocalVideoDuration(data.data.url)

        // Tek bir state güncellemesi ile videoUrl, videoType ve duration güncelle
        setModules(prev => {
          const updated = [...prev]
          updated[mi].lessons[li] = {
            ...updated[mi].lessons[li],
            videoUrl: data.data.url,
            videoType: 'VIDEO_LOCAL',
            duration: duration
          }
          return updated
        })
        showToast.success('Video yüklendi!')
      } else {
        showToast.error('Yükleme hatası: ' + data.error)
      }
    } catch (e) {
      console.error(e)
      showToast.error('Video yüklenirken hata oluştu')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/instructor"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <h1 className="text-2xl font-bold">{isEditing ? 'Kursu Duzenle' : 'Yeni Kurs'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Kurs Bilgileri</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">Baslik *</label>
            <Input value={course.title} onChange={e => setCourse({ ...course, title: e.target.value })} placeholder="Kurs basligi" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Aciklama</label>
            <textarea value={course.description} onChange={e => setCourse({ ...course, description: e.target.value })}
              className="w-full p-3 border rounded-md min-h-[80px] bg-background" placeholder="Kurs aciklamasi..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Kapak Resmi</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={course.thumbnail}
                    onChange={e => setCourse({ ...course, thumbnail: e.target.value })}
                    placeholder="URL girin veya dosya yükleyin"
                    className="flex-1"
                  />
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        try {
                          const formData = new FormData()
                          formData.append('thumbnail', file)

                          const token = localStorage.getItem('token')
                          const response = await fetch(`${API_URL}/upload/thumbnail`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData,
                          })

                          const data = await response.json()
                          if (data.success) {
                            setCourse({ ...course, thumbnail: data.data.url })
                          } else {
                            showToast.error('Yükleme hatası: ' + data.error)
                          }
                        } catch (err) {
                          console.error(err)
                          showToast.error('Resim yüklenirken hata oluştu')
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" asChild>
                      <span><Upload className="w-4 h-4" /></span>
                    </Button>
                  </label>
                </div>
                {course.thumbnail && (
                  <div className="relative w-32 h-20 rounded overflow-hidden border">
                    <img
                      src={course.thumbnail.startsWith('/') ? `${API_URL.replace('/api', '')}${course.thumbnail}` : course.thumbnail}
                      alt="Kapak"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={course.isPublished} onChange={e => setCourse({ ...course, isPublished: e.target.checked })} className="rounded" />
                <span className="text-sm">Yayinda</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Moduller</CardTitle>
          <Button onClick={addModule} size="sm"><Plus className="w-4 h-4 mr-1" />Modul Ekle</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {modules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Henuz modul yok. Yukaridaki butona tiklayarak ekleyin.</p>
            </div>
          )}
          {modules.map((mod, mi) => (
            <div key={mi} className="border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer" onClick={() => toggleModule(mi)}>
                {mod.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Input value={mod.title} onChange={e => { e.stopPropagation(); updateModule(mi, 'title', e.target.value) }}
                  onClick={e => e.stopPropagation()} placeholder="Modul adi" className="flex-1 bg-background" />
                <span className="text-xs text-muted-foreground px-2">{mod.lessons.length} ders</span>
                <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); removeModule(mi) }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              {mod.isOpen && (
                <div className="p-4 bg-background space-y-3">
                  {/* Modül Açıklaması - Opsiyonel */}
                  <Input value={mod.description} onChange={e => updateModule(mi, 'description', e.target.value)}
                    placeholder="Modül açıklaması (opsiyonel)" className="text-sm" />

                  {/* Ders Listesi - Kompakt Tasarım */}
                  <div className="space-y-2">
                    {mod.lessons.map((les, li) => {
                      const isEditing = editingLesson?.mi === mi && editingLesson?.li === li
                      const isUploading = uploading?.mi === mi && uploading?.li === li

                      return (
                        <div key={li} className="group">
                          {/* Ana Ders Satırı - Her Zaman Görünür */}
                          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isEditing ? 'border-primary bg-primary/5' : 'bg-muted/30 hover:bg-muted/50'
                            }`}>
                            {/* Video Thumbnail / Durum */}
                            <div
                              className="relative w-16 h-10 rounded overflow-hidden bg-muted shrink-0 cursor-pointer"
                              onClick={() => {
                                if (!isEditing) {
                                  setEditingLesson({ mi, li })
                                  setYoutubeInput('')
                                }
                              }}
                            >
                              {isUploading ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                              ) : les.videoUrl ? (
                                <>
                                  {les.videoType === 'VIDEO_YOUTUBE' ? (
                                    <img
                                      src={`https://img.youtube.com/vi/${les.videoUrl}/default.jpg`}
                                      alt="" className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                                      <Play className="w-4 h-4 text-blue-600" />
                                    </div>
                                  )}
                                  <div className={`absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded text-[8px] font-medium ${les.videoType === 'VIDEO_YOUTUBE' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                                    }`}>
                                    {les.videoType === 'VIDEO_YOUTUBE' ? 'YT' : 'MP4'}
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded">
                                  <Video className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </div>

                            {/* Ders Başlığı */}
                            <div className="flex-1 min-w-0">
                              <Input
                                value={les.title}
                                onChange={e => updateLesson(mi, li, 'title', e.target.value)}
                                placeholder="Ders başlığı yazın..."
                                className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 placeholder:text-muted-foreground/50"
                              />
                              {les.videoUrl && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {les.videoType === 'VIDEO_YOUTUBE' ? `youtube.com/watch?v=${les.videoUrl}` : 'Lokal video yüklendi'}
                                  {les.duration > 0 && ` • ${Math.floor(les.duration / 60)}:${(les.duration % 60).toString().padStart(2, '0')}`}
                                </p>
                              )}
                            </div>

                            {/* Aksiyonlar */}
                            <div className="flex items-center gap-1 shrink-0">
                              {!les.videoUrl && !isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setEditingLesson({ mi, li })
                                    setYoutubeInput('')
                                  }}
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Video Ekle
                                </Button>
                              )}
                              {isEditing && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingLesson(null)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeLesson(mi, li)}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* Video Yükleme Paneli - Sadece Düzenleme Modunda */}
                          {isEditing && (
                            <div className="mt-2 ml-6 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                              <div className="flex gap-3">
                                {/* YouTube Seçeneği */}
                                <div className="flex-1">
                                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                                    <Youtube className="w-4 h-4 text-red-500" />
                                    YouTube Linki
                                  </label>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="youtube.com/watch?v=... veya video ID"
                                      value={youtubeInput}
                                      onChange={(e) => setYoutubeInput(e.target.value)}
                                      className="flex-1 h-9 text-sm"
                                    />
                                    <Button
                                      size="sm"
                                      className="h-9"
                                      disabled={!youtubeInput || fetchingDuration}
                                      onClick={async () => {
                                        const val = youtubeInput
                                        const match = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
                                        const videoId = match ? match[1] : (val.length === 11 ? val : null)
                                        if (videoId) {
                                          setFetchingDuration(true)
                                          // YouTube süresini çek
                                          const duration = await fetchYouTubeDuration(videoId)

                                          // State güncellemesi - videoUrl, videoType ve duration
                                          setModules(prev => {
                                            const updated = [...prev]
                                            updated[mi].lessons[li] = {
                                              ...updated[mi].lessons[li],
                                              videoUrl: videoId,
                                              videoType: 'VIDEO_YOUTUBE',
                                              duration: duration
                                            }
                                            return updated
                                          })
                                          setYoutubeInput('')
                                          setFetchingDuration(false)
                                        } else {
                                          showToast.warning('Geçerli bir YouTube linki girin')
                                        }
                                      }}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Ayırıcı */}
                                <div className="flex flex-col items-center justify-center px-2">
                                  <div className="w-px h-4 bg-border" />
                                  <span className="text-xs text-muted-foreground py-1">veya</span>
                                  <div className="w-px h-4 bg-border" />
                                </div>

                                {/* Dosya Yükleme */}
                                <div className="flex-1">
                                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
                                    <Upload className="w-4 h-4 text-blue-500" />
                                    Video Dosyası
                                  </label>
                                  <div
                                    className="h-9 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5') }}
                                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5') }}
                                    onDrop={(e) => {
                                      e.preventDefault()
                                      e.currentTarget.classList.remove('border-primary', 'bg-primary/5')
                                      const file = e.dataTransfer.files[0]
                                      if (file && file.type.startsWith('video/')) {
                                        handleVideoUpload(mi, li, file)
                                        // setEditingLesson(null) - Form acik kalsin
                                      }
                                    }}
                                  >
                                    <input
                                      ref={fileInputRef}
                                      type="file"
                                      accept="video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleVideoUpload(mi, li, file)
                                          // setEditingLesson(null) - Form acik kalsin
                                        }
                                      }}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      Tıkla veya sürükle bırak
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Ders Açıklaması */}
                              <div className="pt-2 border-t space-y-3">
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ders Açıklaması</label>
                                  <textarea
                                    value={les.description}
                                    onChange={e => updateLesson(mi, li, 'description', e.target.value)}
                                    placeholder="Bu derste neler öğrenilecek? Detaylı açıklama yazın..."
                                    className="w-full p-2 border rounded-md text-sm min-h-[60px] bg-background resize-none"
                                  />
                                </div>

                                {/* Thumbnail ve Süre */}
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Ders Thumbnail</label>
                                    <div className="flex gap-2 items-center">
                                      <Input
                                        value={les.thumbnailUrl || ''}
                                        onChange={e => updateLesson(mi, li, 'thumbnailUrl', e.target.value)}
                                        placeholder="URL girin veya yükleyin"
                                        className="h-8 text-xs flex-1"
                                      />
                                      <label className="cursor-pointer shrink-0">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            try {
                                              const formData = new FormData()
                                              formData.append('thumbnail', file)
                                              const token = localStorage.getItem('token')
                                              const response = await fetch(`${API_URL}/upload/thumbnail`, {
                                                method: 'POST',
                                                headers: { 'Authorization': `Bearer ${token}` },
                                                body: formData,
                                              })
                                              const data = await response.json()
                                              if (data.success) {
                                                updateLesson(mi, li, 'thumbnailUrl', data.data.url)
                                              } else {
                                                showToast.error('Yükleme hatası: ' + data.error)
                                              }
                                            } catch (err) {
                                              showToast.error('Resim yüklenirken hata oluştu')
                                            }
                                          }}
                                        />
                                        <Button type="button" variant="outline" size="sm" className="h-8" asChild>
                                          <span><Upload className="w-3 h-3" /></span>
                                        </Button>
                                      </label>
                                      {les.thumbnailUrl && (
                                        <div className="w-12 h-8 rounded overflow-hidden border shrink-0">
                                          <img
                                            src={les.thumbnailUrl.startsWith('/') ? `${API_URL.replace('/api', '')}${les.thumbnailUrl}` : les.thumbnailUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-28">
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Süre (otomatik)</label>
                                    <div className="h-8 px-2 flex items-center bg-muted/50 border rounded-md text-xs text-muted-foreground">
                                      {les.duration > 0
                                        ? `${Math.floor(les.duration / 60)}:${(les.duration % 60).toString().padStart(2, '0')}`
                                        : 'Video ekleyin'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Ders Ekle Butonu */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addLesson(mi)
                      // Yeni eklenen dersi düzenleme moduna al
                      setTimeout(() => {
                        setEditingLesson({ mi, li: modules[mi].lessons.length })
                      }, 50)
                    }}
                    className="w-full h-9 border-dashed"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Yeni Ders Ekle
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {modules.length} modul, {modules.reduce((a, m) => a + m.lessons.length, 0)} ders
            </span>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />{saving ? 'Kaydediliyor...' : 'Kaydet ve Bitir'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

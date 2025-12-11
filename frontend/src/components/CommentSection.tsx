import { useState, useEffect } from 'react'
import { MessageCircle, Send, Trash2, Reply, Clock, ChevronDown, ChevronUp, User } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { commentsApi } from '../lib/api'
import { useAuthStore } from '../store/auth.store'

interface CommentUser {
  id: string
  name: string
  avatar?: string
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
}

interface CommentReply {
  id: string
  content: string
  timestamp?: number
  createdAt: string
  user: CommentUser
}

interface Comment {
  id: string
  content: string
  timestamp?: number
  createdAt: string
  user: CommentUser
  replies: CommentReply[]
}

interface CommentSectionProps {
  lessonId: string
  courseInstructorId?: string
  currentTimestamp?: number
  onTimestampClick?: (seconds: number) => void
}

// Zaman formatla
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Tarih formatla
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Az önce'
  if (minutes < 60) return `${minutes} dk önce`
  if (hours < 24) return `${hours} saat önce`
  if (days < 7) return `${days} gün önce`
  return date.toLocaleDateString('tr-TR')
}

// Rol badge'i
function RoleBadge({ role }: { role: string }) {
  if (role === 'INSTRUCTOR') {
    return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">Eğitmen</span>
  }
  if (role === 'ADMIN') {
    return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">Admin</span>
  }
  return null
}

export default function CommentSection({
  lessonId,
  courseInstructorId,
  currentTimestamp,
  onTimestampClick,
}: CommentSectionProps) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [includeTimestamp, setIncludeTimestamp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())

  // Yorumları yükle
  useEffect(() => {
    loadComments()
  }, [lessonId])

  const loadComments = async () => {
    try {
      const res = await commentsApi.getByLesson(lessonId)
      setComments(res.data.data)
    } catch (error) {
      console.error('Yorumlar yüklenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  // Yorum gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      const data: { content: string; timestamp?: number } = {
        content: newComment.trim(),
      }
      if (includeTimestamp && currentTimestamp !== undefined) {
        data.timestamp = currentTimestamp
      }

      await commentsApi.create(lessonId, data)
      setNewComment('')
      setIncludeTimestamp(false)
      loadComments()
    } catch (error) {
      console.error('Yorum gönderilemedi:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Yanıt gönder
  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return

    setSubmitting(true)
    try {
      await commentsApi.create(lessonId, {
        content: replyContent.trim(),
        parentId,
      })
      setReplyContent('')
      setReplyingTo(null)
      loadComments()
    } catch (error) {
      console.error('Yanıt gönderilemedi:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Yorum sil
  const handleDelete = async (commentId: string) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return

    try {
      await commentsApi.delete(commentId)
      loadComments()
    } catch (error) {
      console.error('Yorum silinemedi:', error)
    }
  }

  // Silme yetkisi kontrol
  const canDelete = (comment: CommentReply | Comment) => {
    if (!user) return false
    // Yorum sahibi
    if (comment.user.id === user.id) return true
    // Admin
    if (user.role === 'ADMIN') return true
    // Dersin eğitmeni
    if (user.role === 'INSTRUCTOR' && courseInstructorId === user.id) return true
    return false
  }

  // Yanıtları aç/kapat
  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedReplies(newExpanded)
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Yorumlar yükleniyor...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">Yorumlar ({comments.length})</h3>
      </div>

      {/* Yeni Yorum Formu */}
      {user && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorum yazın..."
                className="w-full"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimestamp}
                    onChange={(e) => setIncludeTimestamp(e.target.checked)}
                    className="rounded"
                  />
                  <Clock className="w-3 h-3" />
                  Zaman damgası ekle {currentTimestamp !== undefined && `(${formatTime(currentTimestamp)})`}
                </label>
                <Button type="submit" size="sm" disabled={!newComment.trim() || submitting}>
                  <Send className="w-4 h-4 mr-1" />
                  Gönder
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Yorum Listesi */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Henüz yorum yok. İlk yorumu siz yapın!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              {/* Ana Yorum */}
              <div className="flex gap-3 p-3 rounded-lg bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {comment.user.avatar ? (
                    <img src={comment.user.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{comment.user.name}</span>
                    <RoleBadge role={comment.user.role} />
                    <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                    {comment.timestamp !== null && comment.timestamp !== undefined && (
                      <button
                        onClick={() => onTimestampClick?.(comment.timestamp!)}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        {formatTime(comment.timestamp)}
                      </button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                  
                  {/* Aksiyonlar */}
                  <div className="flex items-center gap-2 mt-2">
                    {user && (
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Reply className="w-3 h-3" />
                        Yanıtla
                      </button>
                    )}
                    {comment.replies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {expandedReplies.has(comment.id) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        {comment.replies.length} yanıt
                      </button>
                    )}
                    {canDelete(comment) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Yanıt Formu */}
              {replyingTo === comment.id && (
                <div className="ml-11 flex gap-2">
                  <Input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Yanıt yazın..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim() || submitting}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent('')
                    }}
                  >
                    İptal
                  </Button>
                </div>
              )}

              {/* Yanıtlar */}
              {expandedReplies.has(comment.id) && comment.replies.length > 0 && (
                <div className="ml-11 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3 p-3 rounded-lg bg-muted/20 border-l-2 border-primary/30">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {reply.user.avatar ? (
                          <img src={reply.user.avatar} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <User className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{reply.user.name}</span>
                          <RoleBadge role={reply.user.role} />
                          <span className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
                        {canDelete(reply) && (
                          <button
                            onClick={() => handleDelete(reply.id)}
                            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors mt-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Sil
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

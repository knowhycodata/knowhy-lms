import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export class CommentService {
  // Ders yorumlarını getir (yanıtlarla birlikte, hiyerarşik)
  async findByLesson(lessonId: string) {
    // Sadece ana yorumları getir (parentId = null)
    const comments = await prisma.comment.findMany({
      where: { 
        lessonId,
        parentId: null // Sadece ana yorumlar
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
      },
    });
    return comments;
  }

  async findById(id: string) {
    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: { instructorId: true }
                }
              }
            }
          }
        }
      },
    });

    if (!comment) {
      throw new NotFoundError('Yorum bulunamadı');
    }

    return comment;
  }

  // Yorum oluştur (ana yorum veya yanıt)
  async create(
    lessonId: string,
    userId: string,
    data: { content: string; timestamp?: number; parentId?: string }
  ) {
    // Eğer yanıt ise, parent yorumun aynı derse ait olduğunu kontrol et
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });
      if (!parentComment || parentComment.lessonId !== lessonId) {
        throw new ForbiddenError('Geçersiz yanıt');
      }
    }

    return prisma.comment.create({
      data: {
        content: data.content,
        timestamp: data.timestamp,
        lessonId,
        userId,
        parentId: data.parentId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });
  }

  async update(id: string, userId: string, userRole: string, data: { content: string }) {
    const comment = await this.findById(id);

    // Sadece yorum sahibi veya admin güncelleyebilir
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('Bu yorumu düzenleme yetkiniz yok');
    }

    return prisma.comment.update({
      where: { id },
      data: { content: data.content },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });
  }

  // Yorum sil - yorum sahibi, admin veya dersin eğitmeni silebilir
  async delete(id: string, userId: string, userRole: string) {
    const comment = await this.findById(id);
    
    // Dersin eğitmenini bul
    const courseInstructorId = comment.lesson.module.course.instructorId;

    // Yorum sahibi, admin veya dersin eğitmeni silebilir
    const canDelete = 
      comment.userId === userId || 
      userRole === 'ADMIN' || 
      (userRole === 'INSTRUCTOR' && courseInstructorId === userId);

    if (!canDelete) {
      throw new ForbiddenError('Bu yorumu silme yetkiniz yok');
    }

    return prisma.comment.delete({
      where: { id },
    });
  }
}

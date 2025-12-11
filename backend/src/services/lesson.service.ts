import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

// VideoType enum - Prisma generate sonrası @prisma/client'tan import edilebilir
type VideoType = 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE';

export class LessonService {
  async findByModule(moduleId: string) {
    return prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      include: {
        attachments: true,
        _count: {
          select: { comments: true },
        },
      },
    });
  }

  async findById(id: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: {
              select: { id: true, title: true, instructorId: true },
            },
          },
        },
        attachments: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    return lesson;
  }

  async create(
    moduleId: string,
    data: {
      title: string;
      description?: string;
      videoType: VideoType;
      videoUrl: string;
      duration?: number;
      thumbnailUrl?: string;
    }
  ) {
    // Sıra numarasını hesapla
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
    });

    const order = lastLesson ? lastLesson.order + 1 : 1;

    return prisma.lesson.create({
      data: {
        ...data,
        order,
        moduleId,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      videoType?: VideoType;
      videoUrl?: string;
      duration?: number;
      thumbnailUrl?: string;
      order?: number;
    }
  ) {
    await this.findById(id);

    return prisma.lesson.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return prisma.lesson.delete({
      where: { id },
    });
  }

  async reorder(moduleId: string, lessonIds: string[]) {
    const updates = lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { order: index + 1 },
      })
    );

    await prisma.$transaction(updates);
  }

  // Enrollment kontrolü ile ders detayı getir
  async findByIdWithDetails(id: string, userId?: string, userRole?: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: {
              select: { id: true, title: true, instructorId: true },
            },
          },
        },
        attachments: true,
      },
    });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    // Enrollment kontrolü - sadece STUDENT için gerekli
    if (userId && userRole === 'STUDENT') {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: lesson.module.course.id,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenError('Bu dersi görmek için kursa kayıt olmalısınız');
      }
    }

    return lesson;
  }

  async getNavigation(lessonId: string, userId: string) {
    // Önce mevcut dersi bul
    const currentLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!currentLesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    // Aynı modüldeki tüm dersleri sıralı getir
    const lessons = await prisma.lesson.findMany({
      where: { moduleId: currentLesson.moduleId },
      orderBy: { order: 'asc' },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
    });

    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

    return {
      previous: previousLesson ? {
        id: previousLesson.id,
        title: previousLesson.title,
        moduleId: previousLesson.moduleId,
      } : null,
      next: nextLesson ? {
        id: nextLesson.id,
        title: nextLesson.title,
        moduleId: nextLesson.moduleId,
      } : null,
      current: {
        id: currentLesson.id,
        title: currentLesson.title,
        module: currentLesson.module,
      },
    };
  }
}

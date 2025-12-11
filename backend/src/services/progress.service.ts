import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

interface UpdateProgressInput {
  lastWatchedSecond: number;
  totalWatchedSeconds?: number;
  isCompleted?: boolean;
}

export class ProgressService {
  async getProgress(lessonId: string, userId: string) {
    const progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (!progress) {
      return {
        lessonId,
        userId,
        lastWatchedSecond: 0,
        totalWatchedSeconds: 0,
        isCompleted: false,
        completedAt: null,
      };
    }

    return progress;
  }

  async updateProgress(lessonId: string, userId: string, input: UpdateProgressInput) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

    if (!lesson) {
      throw new NotFoundError('Ders bulunamadı');
    }

    // Tamamlanma kontrolü: Video süresinin %90'ı izlendiyse tamamlandı say
    const completionThreshold = lesson.duration * 0.9;
    const isCompleted = input.isCompleted || input.lastWatchedSecond >= completionThreshold;

    return prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
      update: {
        lastWatchedSecond: input.lastWatchedSecond,
        totalWatchedSeconds: {
          increment: input.totalWatchedSeconds || 0,
        },
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      },
      create: {
        userId,
        lessonId,
        lastWatchedSecond: input.lastWatchedSecond,
        totalWatchedSeconds: input.totalWatchedSeconds || 0,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  async getCourseProgress(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Kurs bulunamadı');
    }

    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const totalLessons = lessonIds.length;

    if (totalLessons === 0) {
      return {
        courseId,
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
      };
    }

    const completedLessons = await prisma.progress.count({
      where: {
        userId,
        lessonId: { in: lessonIds },
        isCompleted: true,
      },
    });

    // En son izlenen dersi bul
    const lastWatched = await prisma.progress.findFirst({
      where: {
        userId,
        lessonId: { in: lessonIds }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        lessonId: true
      }
    });

    return {
      courseId,
      totalLessons,
      completedLessons,
      progressPercentage: Math.round((completedLessons / totalLessons) * 100),
      lastWatchedLessonId: lastWatched?.lessonId || null,
    };
  }

  async getUserTotalWatchTime(userId: string) {
    const result = await prisma.progress.aggregate({
      where: { userId },
      _sum: {
        totalWatchedSeconds: true,
      },
    });

    return {
      totalWatchedSeconds: result._sum.totalWatchedSeconds || 0,
      totalWatchedMinutes: Math.round((result._sum.totalWatchedSeconds || 0) / 60),
      totalWatchedHours: Math.round((result._sum.totalWatchedSeconds || 0) / 3600),
    };
  }
}

export const progressService = new ProgressService();

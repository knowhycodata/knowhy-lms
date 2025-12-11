import { prisma } from '../config/prisma.js';

export class AnalyticsService {
  // Genel istatistikler (Admin için)
  async getOverview() {
    const [
      totalUsers,
      totalCourses,
      totalLessons,
      totalEnrollments,
      usersByRole,
      recentEnrollments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.enrollment.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalLessons,
      totalEnrollments,
      usersByRole: usersByRole.reduce((acc: Record<string, number>, item: { role: string; _count: number }) => {
        acc[item.role] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentEnrollments,
    };
  }

  // Kurs istatistikleri
  async getCourseStats(courseId: string) {
    const [course, enrollmentCount, completionStats, lessonStats] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      }),
      prisma.enrollment.count({ where: { courseId } }),
      prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { courseId, completedAt: { not: null } },
        _count: true,
      }),
      prisma.progress.groupBy({
        by: ['lessonId'],
        where: {
          lesson: {
            module: { courseId },
          },
        },
        _avg: {
          totalWatchedSeconds: true,
        },
        _count: {
          isCompleted: true,
        },
      }),
    ]);

    const totalLessons = course?.modules.reduce((acc: number, m: { lessons: unknown[] }) => acc + m.lessons.length, 0) || 0;
    const completedCount = completionStats[0]?._count || 0;

    return {
      courseId,
      enrollmentCount,
      completedCount,
      completionRate: enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0,
      totalLessons,
      lessonStats,
    };
  }

  // Eğitmenin tüm kursları için özet istatistikler
  async getInstructorSummary(instructorId: string) {
    const courses = await prisma.course.findMany({
      where: { instructorId },
      select: {
        id: true,
        title: true,
        isPublished: true,
        modules: {
          select: {
            lessons: {
              select: { id: true },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    const courseStats = await Promise.all(
      courses.map(async (course) => {
        const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;

        // Tamamlama istatistikleri
        const enrollments = await prisma.enrollment.findMany({
          where: { courseId: course.id },
          select: { id: true, userId: true, completedAt: true },
        });

        let totalCompletedLessons = 0;
        let studentsCompleted = 0;

        for (const enrollment of enrollments) {
          const completedLessons = await prisma.progress.count({
            where: {
              userId: enrollment.userId,
              lessonId: { in: lessonIds },
              isCompleted: true,
            },
          });
          totalCompletedLessons += completedLessons;
          if (totalLessons > 0 && completedLessons === totalLessons) {
            studentsCompleted++;
          }
        }

        const enrollmentCount = course._count.enrollments;
        const avgProgress = enrollmentCount > 0 && totalLessons > 0
          ? Math.round((totalCompletedLessons / (enrollmentCount * totalLessons)) * 100)
          : 0;

        return {
          courseId: course.id,
          courseTitle: course.title,
          isPublished: course.isPublished,
          enrollmentCount,
          totalLessons,
          studentsCompleted,
          completionRate: enrollmentCount > 0 ? Math.round((studentsCompleted / enrollmentCount) * 100) : 0,
          avgProgress,
        };
      })
    );

    // Özet hesapla
    const totalStudents = courseStats.reduce((a, c) => a + c.enrollmentCount, 0);
    const totalLessonsAll = courseStats.reduce((a, c) => a + c.totalLessons, 0);
    const publishedCourses = courseStats.filter((c) => c.isPublished).length;
    const avgCompletionRate = courseStats.length > 0
      ? Math.round(courseStats.reduce((a, c) => a + c.completionRate, 0) / courseStats.length)
      : 0;

    return {
      summary: {
        totalCourses: courses.length,
        publishedCourses,
        totalStudents,
        totalLessons: totalLessonsAll,
        avgCompletionRate,
      },
      courses: courseStats,
    };
  }

  // Departman bazlı istatistikler
  async getDepartmentStats() {
    const stats = await prisma.user.groupBy({
      by: ['department'],
      _count: true,
    });

    const departmentProgress = await Promise.all(
      stats
        .filter((s: { department: string | null }) => s.department)
        .map(async (dept: { department: string | null; _count: number }) => {
          const users = await prisma.user.findMany({
            where: { department: dept.department! },
            select: { id: true },
          });

          const userIds = users.map((u: { id: string }) => u.id);

          const totalWatched = await prisma.progress.aggregate({
            where: { userId: { in: userIds } },
            _sum: { totalWatchedSeconds: true },
          });

          const completedLessons = await prisma.progress.count({
            where: { userId: { in: userIds }, isCompleted: true },
          });

          return {
            department: dept.department,
            userCount: dept._count,
            totalWatchedSeconds: totalWatched._sum.totalWatchedSeconds || 0,
            completedLessons,
          };
        })
    );

    return departmentProgress;
  }

  // Detaylı admin raporu
  async getDetailedReport() {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      totalEnrollments,
      completedEnrollments,
      weeklyEnrollments,
      monthlyEnrollments,
      totalWatchTime,
      usersByRole,
      usersByDepartment,
      topCourses,
      recentEnrollments,
      recentProgress,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.lesson.count(),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { completedAt: { not: null } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: lastWeek } } }),
      prisma.enrollment.count({ where: { enrolledAt: { gte: lastMonth } } }),
      prisma.progress.aggregate({ _sum: { totalWatchedSeconds: true } }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.user.groupBy({ by: ['department'], _count: true, orderBy: { _count: { department: 'desc' } }, take: 10 }),
      prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          _count: { select: { enrollments: true } },
        },
        orderBy: { enrollments: { _count: 'desc' } },
        take: 5,
      }),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, department: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      prisma.progress.findMany({
        where: { updatedAt: { gte: lastWeek } },
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, department: true } },
          lesson: { select: { id: true, title: true } },
        },
      }),
    ]);

    const totalWatchHours = Math.floor((totalWatchTime._sum.totalWatchedSeconds || 0) / 3600);
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    return {
      summary: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalCourses,
        publishedCourses,
        totalLessons,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        totalWatchHours,
        weeklyEnrollments,
        monthlyEnrollments,
      },
      usersByRole: usersByRole.reduce((acc: Record<string, number>, item: { role: string; _count: number }) => {
        acc[item.role] = item._count;
        return acc;
      }, {} as Record<string, number>),
      usersByDepartment: usersByDepartment
        .filter((d: { department: string | null }) => d.department)
        .map((d: { department: string | null; _count: number }) => ({
          department: d.department,
          count: d._count,
        })),
      topCourses: topCourses.map((c) => ({
        id: c.id,
        title: c.title,
        enrollments: c._count.enrollments,
      })),
      recentEnrollments,
      recentProgress,
    };
  }

  // Kullanıcı aktivite raporu
  async getUserActivity(userId: string) {
    const [enrollments, progress, recentActivity] = await Promise.all([
      prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
      }),
      prisma.progress.findMany({
        where: { userId },
        include: {
          lesson: {
            select: { id: true, title: true, duration: true },
          },
        },
      }),
      prisma.progress.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          lesson: {
            select: { id: true, title: true },
          },
        },
      }),
    ]);

    const totalWatchedSeconds = progress.reduce((acc: number, p: { totalWatchedSeconds: number }) => acc + p.totalWatchedSeconds, 0);
    const completedLessons = progress.filter((p: { isCompleted: boolean }) => p.isCompleted).length;

    return {
      enrolledCourses: enrollments.length,
      totalWatchedSeconds,
      totalWatchedHours: Math.floor(totalWatchedSeconds / 3600),
      completedLessons,
      totalLessonsInProgress: progress.length,
      recentActivity,
    };
  }

  // Tüm öğrencilerin detaylı raporu
  async getAllStudentsReport() {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            enrolledAt: true,
            completedAt: true,
            course: { select: { id: true, title: true } },
          },
        },
        progress: {
          select: {
            id: true,
            lessonId: true,
            lastWatchedSecond: true,
            totalWatchedSeconds: true,
            isCompleted: true,
            updatedAt: true,
            lesson: {
              select: {
                id: true,
                title: true,
                duration: true,
                module: { select: { course: { select: { id: true, title: true } } } }
              }
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return students.map((student) => {
      const totalWatchedSeconds = student.progress.reduce((acc, p) => acc + p.totalWatchedSeconds, 0);
      const completedLessons = student.progress.filter((p) => p.isCompleted).length;
      const lastActivity = student.progress[0];

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        department: student.department,
        joinedAt: student.createdAt,
        enrolledCourses: student.enrollments.length,
        completedCourses: student.enrollments.filter((e) => e.completedAt).length,
        totalWatchedSeconds,
        totalWatchedMinutes: Math.floor(totalWatchedSeconds / 60),
        completedLessons,
        totalLessonsStarted: student.progress.length,
        lastActivity: lastActivity ? {
          lessonTitle: lastActivity.lesson.title,
          courseTitle: lastActivity.lesson.module.course.title,
          watchedSeconds: lastActivity.lastWatchedSecond,
          updatedAt: lastActivity.updatedAt,
        } : null,
      };
    });
  }

  // En çok izlenen videolar
  async getMostWatchedLessons(limit = 10) {
    const lessons = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
        duration: true,
        videoType: true,
        module: {
          select: {
            course: { select: { id: true, title: true } },
          },
        },
        progress: {
          select: {
            totalWatchedSeconds: true,
            isCompleted: true,
            userId: true,
          },
        },
      },
    });

    const lessonStats = lessons.map((lesson) => {
      const totalViews = lesson.progress.length;
      const uniqueViewers = new Set(lesson.progress.map((p) => p.userId)).size;
      const totalWatchedSeconds = lesson.progress.reduce((acc, p) => acc + p.totalWatchedSeconds, 0);
      const completions = lesson.progress.filter((p) => p.isCompleted).length;
      const avgWatchTime = totalViews > 0 ? Math.floor(totalWatchedSeconds / totalViews) : 0;
      const completionRate = totalViews > 0 ? Math.round((completions / totalViews) * 100) : 0;

      return {
        id: lesson.id,
        title: lesson.title,
        courseTitle: lesson.module.course.title,
        courseId: lesson.module.course.id,
        duration: lesson.duration,
        videoType: lesson.videoType,
        totalViews,
        uniqueViewers,
        totalWatchedSeconds,
        totalWatchedMinutes: Math.floor(totalWatchedSeconds / 60),
        completions,
        completionRate,
        avgWatchTime,
      };
    });

    // En çok izlenene göre sırala
    return lessonStats
      .sort((a, b) => b.totalWatchedSeconds - a.totalWatchedSeconds)
      .slice(0, limit);
  }

  // Aktif kullanıcılar (şu an izleyenler - son 5 dakika)
  async getActiveUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeProgress = await prisma.progress.findMany({
      where: {
        updatedAt: { gte: fiveMinutesAgo },
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { course: { select: { id: true, title: true } } } }
          }
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return activeProgress.map((p) => ({
      id: p.id,
      user: p.user,
      lesson: {
        id: p.lesson.id,
        title: p.lesson.title,
        courseTitle: p.lesson.module.course.title,
      },
      lastWatchedSecond: p.lastWatchedSecond,
      updatedAt: p.updatedAt,
    }));
  }
}

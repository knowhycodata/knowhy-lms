import { prisma } from '../config/prisma.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';

interface CreateCourseInput {
  title: string;
  description?: string;
  thumbnail?: string;
  instructorId: string;
}

interface UpdateCourseInput {
  title?: string;
  description?: string;
  thumbnail?: string;
  isPublished?: boolean;
}

export class CourseService {
  async findAll(
    page = 1,
    limit = 10,
    filters?: { isPublished?: boolean; instructorId?: string },
    userId?: string,
    userRole?: string
  ) {
    const skip = (page - 1) * limit;

    // Öğrenci için sadece kayıtlı olduğu kursları getir
    if (userRole === 'STUDENT' && userId) {
      const enrolledCourses = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
              modules: {
                select: {
                  id: true,
                  _count: {
                    select: { lessons: true },
                  },
                },
              },
              _count: {
                select: { enrollments: true },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });

      const courses = enrolledCourses.map((e) => ({
        ...e.course,
        isEnrolled: true,
        enrolledAt: e.enrolledAt,
      }));

      return {
        courses,
        pagination: {
          page: 1,
          limit: courses.length,
          total: courses.length,
          totalPages: 1,
        },
      };
    }

    // Admin/Instructor için tüm kursları getir
    const where = {
      ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
      ...(filters?.instructorId && { instructorId: filters.instructorId }),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          modules: {
            select: {
              id: true,
              _count: {
                select: { lessons: true },
              },
            },
          },
          _count: {
            select: { enrollments: true },
          },
          // Kullanıcının enrollment'ını da getir (varsa)
          enrollments: userId ? {
            where: { userId },
            select: { id: true, enrolledAt: true },
          } : false,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ]);

    // isEnrolled bilgisini ekle
    const coursesWithEnrollment = courses.map((course) => {
      const { enrollments, ...rest } = course as any;
      return {
        ...rest,
        isEnrolled: enrollments && enrollments.length > 0,
        enrolledAt: enrollments?.[0]?.enrolledAt || null,
      };
    });

    return {
      courses: coursesWithEnrollment,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, userId?: string, userRole?: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                description: true,
                order: true,
                videoType: true,
                duration: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Kurs bulunamadı');
    }

    // Öğrenci için enrollment kontrolü
    if (userRole === 'STUDENT' && userId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: id,
          },
        },
      });

      if (!enrollment) {
        throw new ForbiddenError('Bu kursa erişmek için kayıtlı olmalısınız');
      }
    }

    return course;
  }

  async create(input: CreateCourseInput) {
    return prisma.course.create({
      data: input,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, input: UpdateCourseInput, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundError('Kurs bulunamadı');
    }

    if (userRole !== 'ADMIN' && course.instructorId !== userId) {
      throw new ForbiddenError('Bu kursu düzenleme yetkiniz yok');
    }

    return prisma.course.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundError('Kurs bulunamadı');
    }

    if (userRole !== 'ADMIN' && course.instructorId !== userId) {
      throw new ForbiddenError('Bu kursu silme yetkiniz yok');
    }

    await prisma.course.delete({ where: { id } });
    return { message: 'Kurs silindi' };
  }

  async enroll(courseId: string, userId: string, enrolledByInstructor = false) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundError('Kurs bulunamadı');
    }

    // Eğitmen tarafından eklenmiyorsa ve kurs yayınlanmamışsa hata ver
    if (!enrolledByInstructor && !course.isPublished) {
      throw new ForbiddenError('Bu kurs henüz yayınlanmamış');
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictError('Bu kursa zaten kayıtlısınız');
    }

    return prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async getEnrolledCourses(userId: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
              },
            },
            modules: {
              include: {
                lessons: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    // Her enrollment için ilerleme hesapla
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lessonIds = enrollment.course.modules.flatMap((m) => m.lessons.map((l) => l.id));
        const totalLessons = lessonIds.length;

        if (totalLessons === 0) {
          return {
            ...enrollment,
            progressPercentage: 0,
            completedLessons: 0,
            totalLessons: 0,
            isCompleted: false,
          };
        }

        const completedLessons = await prisma.progress.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            isCompleted: true,
          },
        });

        const progressPercentage = Math.round((completedLessons / totalLessons) * 100);
        const isCompleted = progressPercentage === 100;

        // Kurs tamamlandıysa enrollment'ı güncelle
        if (isCompleted && !enrollment.completedAt) {
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { completedAt: new Date() },
          });
        }

        return {
          ...enrollment,
          progressPercentage,
          completedLessons,
          totalLessons,
          isCompleted,
        };
      })
    );

    return enrollmentsWithProgress;
  }

  async getEnrollments(courseId: string) {
    return prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async removeEnrollment(enrollmentId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundError('Kayit bulunamadi');
    }

    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return { message: 'Kayit silindi' };
  }
}

export const courseService = new CourseService();

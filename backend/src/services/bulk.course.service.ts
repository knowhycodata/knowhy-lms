import { prisma } from '../config/prisma.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

interface LessonInput {
    id?: string;
    title: string;
    description?: string;
    videoType: 'VIDEO_LOCAL' | 'VIDEO_YOUTUBE';
    videoUrl: string;
    duration?: number;
    thumbnailUrl?: string;
    order?: number;
}

interface ModuleInput {
    id?: string;
    title: string;
    description?: string;
    order?: number;
    lessons: LessonInput[];
}

interface BulkCourseInput {
    title: string;
    description?: string;
    thumbnail?: string;
    isPublished?: boolean;
    modules: ModuleInput[];
}

export class BulkCourseService {
    /**
     * Yeni kurs oluşturur - Course + Modules + Lessons tek transaction içinde
     */
    async createCourseWithContent(instructorId: string, input: BulkCourseInput) {
        return prisma.$transaction(async (tx) => {
            // 1. Kursu oluştur
            const course = await tx.course.create({
                data: {
                    title: input.title,
                    description: input.description,
                    thumbnail: input.thumbnail,
                    isPublished: input.isPublished || false,
                    instructorId,
                },
            });

            // 2. Modülleri ve dersleri oluştur
            for (let moduleIndex = 0; moduleIndex < input.modules.length; moduleIndex++) {
                const moduleInput = input.modules[moduleIndex];

                const module = await tx.module.create({
                    data: {
                        title: moduleInput.title,
                        description: moduleInput.description,
                        order: moduleInput.order ?? moduleIndex,
                        courseId: course.id,
                    },
                });

                // Dersleri oluştur
                for (let lessonIndex = 0; lessonIndex < moduleInput.lessons.length; lessonIndex++) {
                    const lessonInput = moduleInput.lessons[lessonIndex];

                    await tx.lesson.create({
                        data: {
                            title: lessonInput.title,
                            description: lessonInput.description,
                            videoType: lessonInput.videoType,
                            videoUrl: lessonInput.videoUrl,
                            duration: lessonInput.duration || 0,
                            thumbnailUrl: lessonInput.thumbnailUrl,
                            order: lessonInput.order ?? lessonIndex,
                            moduleId: module.id,
                        },
                    });
                }
            }

            // 3. Oluşturulan kursu tüm ilişkileriyle döndür
            return tx.course.findUnique({
                where: { id: course.id },
                include: {
                    instructor: {
                        select: { id: true, name: true },
                    },
                    modules: {
                        orderBy: { order: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });
        });
    }

    /**
     * Mevcut kursu günceller - Course + Modules + Lessons tek transaction içinde
     * Silinen modüller/dersler otomatik olarak kaldırılır
     */
    async updateCourseWithContent(
        courseId: string,
        userId: string,
        userRole: string,
        input: BulkCourseInput
    ) {
        // Önce yetki kontrolü
        const existingCourse = await prisma.course.findUnique({
            where: { id: courseId },
            include: {
                modules: {
                    include: { lessons: true },
                },
            },
        });

        if (!existingCourse) {
            throw new NotFoundError('Kurs bulunamadı');
        }

        if (userRole !== 'ADMIN' && existingCourse.instructorId !== userId) {
            throw new ForbiddenError('Bu kursu düzenleme yetkiniz yok');
        }

        return prisma.$transaction(async (tx) => {
            // 1. Kursu güncelle
            await tx.course.update({
                where: { id: courseId },
                data: {
                    title: input.title,
                    description: input.description,
                    thumbnail: input.thumbnail,
                    isPublished: input.isPublished,
                },
            });

            // 2. Mevcut modül ve ders ID'lerini topla
            const existingModuleIds = existingCourse.modules.map((m) => m.id);
            const existingLessonIds = existingCourse.modules.flatMap((m) => m.lessons.map((l) => l.id));

            const newModuleIds: string[] = [];
            const newLessonIds: string[] = [];

            // 3. Modülleri işle
            for (let moduleIndex = 0; moduleIndex < input.modules.length; moduleIndex++) {
                const moduleInput = input.modules[moduleIndex];

                let moduleId: string;

                if (moduleInput.id && existingModuleIds.includes(moduleInput.id)) {
                    // Mevcut modülü güncelle
                    await tx.module.update({
                        where: { id: moduleInput.id },
                        data: {
                            title: moduleInput.title,
                            description: moduleInput.description,
                            order: moduleInput.order ?? moduleIndex,
                        },
                    });
                    moduleId = moduleInput.id;
                } else {
                    // Yeni modül oluştur
                    const newModule = await tx.module.create({
                        data: {
                            title: moduleInput.title,
                            description: moduleInput.description,
                            order: moduleInput.order ?? moduleIndex,
                            courseId,
                        },
                    });
                    moduleId = newModule.id;
                }
                newModuleIds.push(moduleId);

                // 4. Dersleri işle
                for (let lessonIndex = 0; lessonIndex < moduleInput.lessons.length; lessonIndex++) {
                    const lessonInput = moduleInput.lessons[lessonIndex];

                    if (lessonInput.id && existingLessonIds.includes(lessonInput.id)) {
                        // Mevcut dersi güncelle
                        await tx.lesson.update({
                            where: { id: lessonInput.id },
                            data: {
                                title: lessonInput.title,
                                description: lessonInput.description,
                                videoType: lessonInput.videoType,
                                videoUrl: lessonInput.videoUrl,
                                duration: lessonInput.duration || 0,
                                thumbnailUrl: lessonInput.thumbnailUrl,
                                order: lessonInput.order ?? lessonIndex,
                                moduleId, // Modül değişmiş olabilir
                            },
                        });
                        newLessonIds.push(lessonInput.id);
                    } else {
                        // Yeni ders oluştur
                        const newLesson = await tx.lesson.create({
                            data: {
                                title: lessonInput.title,
                                description: lessonInput.description,
                                videoType: lessonInput.videoType,
                                videoUrl: lessonInput.videoUrl,
                                duration: lessonInput.duration || 0,
                                thumbnailUrl: lessonInput.thumbnailUrl,
                                order: lessonInput.order ?? lessonIndex,
                                moduleId,
                            },
                        });
                        newLessonIds.push(newLesson.id);
                    }
                }
            }

            // 5. Silinen dersleri kaldır
            const lessonsToDelete = existingLessonIds.filter((id) => !newLessonIds.includes(id));
            if (lessonsToDelete.length > 0) {
                await tx.lesson.deleteMany({
                    where: { id: { in: lessonsToDelete } },
                });
            }

            // 6. Silinen modülleri kaldır
            const modulesToDelete = existingModuleIds.filter((id) => !newModuleIds.includes(id));
            if (modulesToDelete.length > 0) {
                await tx.module.deleteMany({
                    where: { id: { in: modulesToDelete } },
                });
            }

            // 7. Güncellenmiş kursu döndür
            return tx.course.findUnique({
                where: { id: courseId },
                include: {
                    instructor: {
                        select: { id: true, name: true },
                    },
                    modules: {
                        orderBy: { order: 'asc' },
                        include: {
                            lessons: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });
        });
    }
}

export const bulkCourseService = new BulkCourseService();

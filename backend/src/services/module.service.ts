import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';

export class ModuleService {
  async findByCourse(courseId: string) {
    return prisma.module.findMany({
      where: { courseId },
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
        _count: {
          select: { lessons: true },
        },
      },
    });
  }

  async findById(id: string) {
    const module = await prisma.module.findUnique({
      where: { id },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
        course: {
          select: { id: true, title: true, instructorId: true },
        },
      },
    });

    if (!module) {
      throw new NotFoundError('Modül bulunamadı');
    }

    return module;
  }

  async create(courseId: string, data: { title: string; description?: string }) {
    // Sıra numarasını hesapla
    const lastModule = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    });

    const order = lastModule ? lastModule.order + 1 : 1;

    return prisma.module.create({
      data: {
        ...data,
        order,
        courseId,
      },
    });
  }

  async update(id: string, data: { title?: string; description?: string; order?: number }) {
    await this.findById(id);

    return prisma.module.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return prisma.module.delete({
      where: { id },
    });
  }

  async reorder(courseId: string, moduleIds: string[]) {
    const updates = moduleIds.map((id, index) =>
      prisma.module.update({
        where: { id },
        data: { order: index + 1 },
      })
    );

    await prisma.$transaction(updates);
  }
}

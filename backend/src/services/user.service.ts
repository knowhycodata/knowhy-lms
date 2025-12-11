import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

// Role enum - Prisma generate sonrası @prisma/client'tan import edilebilir
type Role = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  department?: string;
  avatar?: string;
  isActive?: boolean;
  status?: UserStatus;
}

interface FindAllParams {
  page?: number;
  limit?: number;
  role?: Role;
  department?: string;
  search?: string;
  status?: UserStatus;
}

export class UserService {
  async findAll(params: FindAllParams = {}) {
    const { page = 1, limit = 10, role, department, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) where.role = role;
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          avatar: true,
          isActive: true,
          status: true,
          createdAt: true,
        } as any,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar: true,
        isActive: true,
        status: true,
        createdAt: true,
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      } as any,
    });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    if (input.email && input.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        throw new ConflictError('Bu email adresi zaten kullanılıyor');
      }
    }

    const updateData: Record<string, unknown> = { ...input };
    if (input.password) {
      updateData.password = await hashPassword(input.password);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatar: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'Kullanıcı silindi' };
  }

  async changeRole(id: string, role: Role) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    return prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        status: true,
        updatedAt: true,
      } as any,
    });
  }

  async changeStatus(id: string, status: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    return prisma.user.update({
      where: { id },
      data: { status } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        status: true,
        isActive: true,
        updatedAt: true,
      } as any,
    });
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('Kullanıcı bulunamadı');
    }

    return comparePassword(password, user.password);
  }
}

export const userService = new UserService();

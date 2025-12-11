import { prisma } from '../config/prisma.js';
import { NotFoundError } from '../utils/errors.js';
import { config, uploadPath } from '../config/index.js';
import path from 'path';
import fs from 'fs';

export class AttachmentService {
  async findByLesson(lessonId: string) {
    return prisma.attachment.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundError('Dosya bulunamadı');
    }

    return attachment;
  }

  async create(
    lessonId: string,
    file: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
    }
  ) {
    return prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        lessonId,
      },
    });
  }

  async delete(id: string) {
    const attachment = await this.findById(id);

    // Dosyayı diskten sil
    const filePath = path.join(uploadPath, 'attachments', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return prisma.attachment.delete({
      where: { id },
    });
  }

  getFilePath(filename: string): string {
    return path.join(uploadPath, 'attachments', filename);
  }
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin kullanıcısını oluştur (env'den al)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@knowhy.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminName = process.env.ADMIN_NAME || 'Sistem Yöneticisi';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN',
        department: 'Yönetim',
        status: 'APPROVED',
      } as any,
    });
    console.log(`✅ Admin kullanıcısı oluşturuldu: ${admin.email}`);
  } else {
    console.log(`ℹ️ Admin kullanıcısı zaten mevcut: ${existingAdmin.email}`);
  }

  // Demo eğitmen oluştur
  const instructorEmail = 'instructor@knowhy.local';
  const existingInstructor = await prisma.user.findUnique({
    where: { email: instructorEmail },
  });

  if (!existingInstructor) {
    const hashedPassword = await bcrypt.hash('Instructor123!', 10);
    const instructor = await prisma.user.create({
      data: {
        email: instructorEmail,
        password: hashedPassword,
        name: 'Demo Eğitmen',
        role: 'INSTRUCTOR',
        department: 'Eğitim',
        status: 'APPROVED',
      } as any,
    });
    console.log(`✅ Demo eğitmen oluşturuldu: ${instructor.email}`);

    // Demo kurs oluştur
    const course = await prisma.course.create({
      data: {
        title: 'React ile Modern Web Geliştirme',
        description: 'React, TypeScript ve modern araçlarla web uygulaması geliştirmeyi öğrenin.',
        instructorId: instructor.id,
        isPublished: true,
        modules: {
          create: [
            {
              title: 'Giriş',
              description: 'React\'a giriş ve temel kavramlar',
              order: 1,
              lessons: {
                create: [
                  {
                    title: 'React Nedir?',
                    description: 'React kütüphanesine genel bakış',
                    order: 1,
                    videoType: 'VIDEO_YOUTUBE',
                    videoUrl: 'dQw4w9WgXcQ', // Demo YouTube ID
                    duration: 300,
                  },
                  {
                    title: 'Geliştirme Ortamı Kurulumu',
                    description: 'Node.js, npm ve VS Code kurulumu',
                    order: 2,
                    videoType: 'VIDEO_YOUTUBE',
                    videoUrl: 'dQw4w9WgXcQ',
                    duration: 600,
                  },
                ],
              },
            },
            {
              title: 'Temel Kavramlar',
              description: 'Component, Props ve State',
              order: 2,
              lessons: {
                create: [
                  {
                    title: 'Component Yapısı',
                    description: 'Fonksiyonel ve class component\'ler',
                    order: 1,
                    videoType: 'VIDEO_YOUTUBE',
                    videoUrl: 'dQw4w9WgXcQ',
                    duration: 900,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✅ Demo kurs oluşturuldu: ${course.title}`);
  }

  // Demo öğrenci oluştur
  const studentEmail = 'student@knowhy.local';
  const existingStudent = await prisma.user.findUnique({
    where: { email: studentEmail },
  });

  if (!existingStudent) {
    const hashedPassword = await bcrypt.hash('Student123!', 10);
    await prisma.user.create({
      data: {
        email: studentEmail,
        password: hashedPassword,
        name: 'Demo Öğrenci',
        role: 'STUDENT',
        department: 'Yazılım Geliştirme',
        status: 'APPROVED',
      } as any,
    });
    console.log(`✅ Demo öğrenci oluşturuldu: ${studentEmail}`);
  }

  console.log('🎉 Seeding tamamlandı!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

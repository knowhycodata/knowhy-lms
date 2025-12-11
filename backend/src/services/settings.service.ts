import { prisma } from '../config/prisma.js';

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  siteName: 'Knowhy LMS',
  siteDescription: 'Şirket İçi Eğitim Platformu',
  maintenanceMode: false,
  maintenanceMessage: 'Sistem bakımda, lütfen daha sonra tekrar deneyin.',
  maxFileSize: 100, // MB
  maxVideoSize: 500, // MB
  allowedVideoTypes: ['mp4', 'webm', 'mov'],
  allowedDocTypes: ['pdf', 'docx', 'pptx', 'xlsx'],
  passwordMinLength: 6,
  sessionTimeout: 24, // saat
  allowRegistration: true,
};

export type SystemSettings = typeof DEFAULT_SETTINGS;

export class SettingsService {
  // Tüm ayarları getir
  async getAll(): Promise<SystemSettings> {
    const settings = await prisma.systemSetting.findMany();
    
    const result = { ...DEFAULT_SETTINGS };
    
    for (const setting of settings) {
      try {
        (result as any)[setting.key] = JSON.parse(setting.value);
      } catch {
        (result as any)[setting.key] = setting.value;
      }
    }
    
    return result;
  }

  // Tek bir ayar getir
  async get<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return DEFAULT_SETTINGS[key];
    }

    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value as SystemSettings[K];
    }
  }

  // Ayar güncelle
  async set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });
  }

  // Birden fazla ayarı güncelle
  async setMany(settings: Partial<SystemSettings>): Promise<void> {
    const operations = Object.entries(settings).map(([key, value]) => {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue },
      });
    });

    await prisma.$transaction(operations);
  }

  // Bakım modu kontrolü
  async isMaintenanceMode(): Promise<boolean> {
    return this.get('maintenanceMode');
  }

  // Site adını getir
  async getSiteName(): Promise<string> {
    return this.get('siteName');
  }
}

export const settingsService = new SettingsService();

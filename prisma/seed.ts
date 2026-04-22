import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Sedang menyemai data modul dengan PDF...');

  const modules = [
    {
      title: 'Dasar-Dasar Pancasila',
      slug: 'dasar-dasar-pancasila',
      video_url: 'https://www.youtube.com/watch?v=kYv9z57Y5rQ',
      pdf_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf',
      category: 'KEWARGANEGARAAN' as any,
      thumbnail_url: 'https://images.unsplash.com/photo-1590073844006-3a44a7f16e6f?q=80&w=1445&auto=format&fit=crop',
    },
    {
      title: 'Hak dan Kewajiban Warga Negara',
      slug: 'hak-dan-kewajiban',
      video_url: 'https://www.youtube.com/watch?v=S-tJpE-0Ufs',
      pdf_url: 'https://www.unicef.org/indonesia/media/1391/file/Informasi-Hak-Anak.pdf',
      category: 'KEWARGANEGARAAN' as any,
      thumbnail_url: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=1466&auto=format&fit=crop',
    },
    {
      title: 'Sejarah Kerajaan Aceh Darussalam',
      slug: 'sejarah-kerajaan-aceh',
      video_url: 'https://www.youtube.com/watch?v=y2pZtA6Z5-Y',
      pdf_url: 'https://www.unicef.org/indonesia/media/1391/file/Informasi-Hak-Anak.pdf', // Placeholder
      category: 'BUDAYA' as any,
      thumbnail_url: 'https://images.unsplash.com/photo-1596402184320-417d7178b2cd?q=80&w=1470&auto=format&fit=crop',
    },
  ];

  for (const module of modules) {
    await prisma.module.upsert({
      where: { slug: module.slug },
      update: module,
      create: module,
    });
  }

  console.log('Berhasil menyemai data modul dengan PDF!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });

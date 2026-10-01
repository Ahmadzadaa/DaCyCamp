import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { hash } from '@node-rs/argon2';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function resetDb(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "XpEvent","ActivityDay","HintUsage","CtfSolve","Submission","StepProgress","Enrollment","Certificate","LabSession","PathItemProgress","PathCertificate","PathEnrollment","PathItem","LearningPath","CourseImport","CtfTask","Step","Module","Asset","Course","Track","RefreshToken","User" RESTART IDENTITY CASCADE`,
  );
}

export async function seedBasics(prisma: PrismaService) {
  const track = await prisma.track.create({
    data: {
      slug: 'data-analytics',
      title: 'Data Analytics',
      color: '#6C7CF0',
      order: 1,
      isPublished: true,
    },
  });
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.local',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: await hash('Admin123!'),
    },
  });
  const instructor = await prisma.user.create({
    data: {
      email: 'muellim@test.local',
      name: 'Müəllim',
      role: 'INSTRUCTOR',
      passwordHash: await hash('Muellim123!'),
    },
  });
  const student = await prisma.user.create({
    data: {
      email: 'telebe@test.local',
      name: 'Tələbə',
      role: 'STUDENT',
      passwordHash: await hash('Telebe123!'),
    },
  });
  return { track, admin, instructor, student };
}

export function agent(app: INestApplication) {
  return request.agent(app.getHttpServer());
}

export async function login(app: INestApplication, email: string, password: string) {
  const a = agent(app);
  const r = await a.post('/auth/login').send({ email, password });
  if (r.status !== 200) throw new Error(`login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return a;
}

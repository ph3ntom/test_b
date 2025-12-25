import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 정적 파일 제공 설정 (업로드된 파일 접근용)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // ⭐ Redis 클라이언트 생성
  const redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: parseInt(process.env.REDIS_DB || '0'),
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  await redisClient.connect();

  // ⭐ Redis 세션 저장소 생성
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: parseInt(process.env.SESSION_MAX_AGE || '7200000') / 1000,
  });

  // ⭐ 세션 미들웨어 설정 (Redis + Rolling)
  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET || 'fallback-secret-key',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      name: 'connect.sid',
      cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '7200000'),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe());

  // 글로벌 API prefix 설정
  app.setGlobalPrefix('api');

  // ⭐ CORS 설정 (환경 변수 사용)
  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });

  // 모든 IP에서 접근 허용 (0.0.0.0)
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📝 API Prefix: /api`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL}`);
}
bootstrap();

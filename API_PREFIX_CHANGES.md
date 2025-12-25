# API Prefix 변경 사항 요약

## 변경 개요

모든 API 엔드포인트에 `/api` prefix를 추가했습니다.

## 주요 변경 사항

### 1. 백엔드 (NestJS) 설정

#### main.ts
```typescript
// 글로벌 API prefix 설정 추가
app.setGlobalPrefix('api');

// CORS origin에 프론트엔드 서버 추가
app.enableCors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.60.135',      // 프론트엔드 서버
    'http://192.168.60.135:80',
    'http://192.168.60.135:3000', // Next.js 개발 서버
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});

// 모든 IP에서 접근 허용
await app.listen(port, '0.0.0.0');
```

### 2. 엔드포인트 변경

| 기존 | 변경 후 |
|-----|--------|
| `http://localhost:3001/questions` | `http://localhost:3001/api/questions` |
| `http://localhost:3001/login` | `http://localhost:3001/api/login` |
| `http://localhost:3001/register` | `http://localhost:3001/api/register` |
| `http://localhost:3001/users` | `http://localhost:3001/api/users` |
| `http://localhost:3001/coupons` | `http://localhost:3001/api/coupons` |
| `http://localhost:3001/migration/*` | `http://localhost:3001/api/migration/*` |

### 3. 수정된 파일 목록

#### 백엔드 코드
- `src/main.ts` - 글로벌 prefix 추가 및 CORS 설정

#### 스크립트 및 설정
- `package.json` - db 관련 스크립트 (db:seed, db:test, db:validate 등)
- `test-migration.js` - API_BASE URL

#### 문서
- `doc/API_SPECIFICATION.md` - Base URL 및 모든 예시
- `doc/README.md` - curl 명령어 예시
- `doc/MIGRATION_SYSTEM_CHANGES.md` - package.json 스크립트 예시
- `doc/TROUBLESHOOTING.md` - 문제 해결 예시
- `README-MIGRATION.md` - 모든 API 엔드포인트
- `SERVER_SETUP_GUIDE.md` - API 테스트 예시
- `분석.md` - fetch 예시
- `doc/Migration_API.postman_collection.json` - BASE_URL 변수

## 프론트엔드 변경 가이드

### Next.js 환경변수 설정

`.env.local` 또는 `.env` 파일에 추가:

```env
NEXT_PUBLIC_API_URL=http://192.168.60.138:3001/api
# 또는 Nginx 프록시 사용 시
NEXT_PUBLIC_API_URL=/api
```

### API 호출 예시

#### 기존 코드
```javascript
// 변경 전
fetch('http://192.168.60.138:3001/questions')
  .then(res => res.json())
```

#### 변경 후
```javascript
// 직접 호출
fetch('http://192.168.60.138:3001/api/questions')
  .then(res => res.json())

// 또는 환경변수 사용
fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions`)
  .then(res => res.json())

// 또는 Nginx 프록시 사용
fetch('/api/questions')
  .then(res => res.json())
```

### axios 사용 시

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.60.138:3001/api',
  withCredentials: true,
});

// 사용 예시
api.get('/questions').then(res => console.log(res.data));
api.post('/login', { userId: 'test', password: 'test' });
```

### React Query 사용 시

```javascript
import { useQuery } from '@tanstack/react-query';

const fetchQuestions = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/questions`);
  return res.json();
};

function QuestionList() {
  const { data, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: fetchQuestions
  });

  // ...
}
```

## Nginx 프록시 설정 (권장)

프론트엔드 서버의 Nginx 설정:

```nginx
server {
    listen 80;
    server_name 192.168.60.135;

    # Next.js 프론트엔드
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 백엔드 API 프록시
    location /api/ {
        proxy_pass http://192.168.60.138:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS 헤더
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
```

프록시 사용 시 프론트엔드 코드:
```javascript
// 같은 도메인의 /api로 호출
fetch('/api/questions')  // → http://192.168.60.138:3001/api/questions
```

## 테스트 방법

### 1. 백엔드 서버 시작
```bash
npm run start:dev
```

### 2. API 테스트
```bash
# 질문 목록 조회
curl http://localhost:3001/api/questions

# 로그인
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"testuser1","password":"user123!"}'

# 마이그레이션 상태
curl http://localhost:3001/api/migration/status
```

### 3. CORS 테스트
```bash
curl -H "Origin: http://192.168.60.135" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://192.168.60.138:3001/api/questions -v
```

### 4. 프론트엔드에서 테스트
브라우저 콘솔 (F12):
```javascript
fetch('http://192.168.60.138:3001/api/questions')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

## 주의사항

1. **모든 API 호출에 `/api` prefix 필수**
   - 기존: `/questions` ❌
   - 변경: `/api/questions` ✅

2. **CORS 설정 확인**
   - 프론트엔드 서버 IP가 백엔드 CORS origin에 포함되어 있는지 확인

3. **환경변수 업데이트**
   - 프론트엔드의 API URL 환경변수 수정 필요

4. **Nginx 프록시 사용 권장**
   - 같은 도메인에서 호출하여 CORS 문제 방지
   - `/api/*` → 백엔드 서버로 프록시

## 롤백 방법

변경사항을 되돌리려면:

1. `src/main.ts`에서 `app.setGlobalPrefix('api');` 제거
2. Git으로 이전 버전으로 되돌리기:
```bash
git checkout HEAD~1 -- src/main.ts
```

## 추가 리소스

- [SERVER_SETUP_GUIDE.md](./SERVER_SETUP_GUIDE.md) - 서버 설정 전체 가이드
- [doc/API_SPECIFICATION.md](./doc/API_SPECIFICATION.md) - API 명세서
- [README-MIGRATION.md](./README-MIGRATION.md) - 마이그레이션 가이드

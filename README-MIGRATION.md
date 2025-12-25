# 데이터베이스 마이그레이션 가이드

## 개요
이 프로젝트는 TypeORM을 사용한 자동 DB 생성 및 테스트 가능한 마이그레이션 시스템을 포함합니다.

## 주요 기능

### 1. 자동 데이터베이스 초기화
- 애플리케이션 시작 시 자동으로 마이그레이션 실행
- 데이터베이스 스키마 자동 생성 및 업데이트
- 환경별 설정 지원

### 2. 마이그레이션 관리
- TypeORM 기반 마이그레이션 시스템
- 버전 관리 및 롤백 지원
- 프로덕션 환경 안전성 보장

### 3. 테스트 데이터 관리
- 개발 및 테스트용 샘플 데이터 자동 생성
- 데이터 정리 및 재생성 기능
- API를 통한 데이터 관리

## 설치 및 설정

### 1. 의존성 설치
```bash
cd back/back
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 설정을 추가:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=phantom
DB_PASSWORD=ehy1123?
DB_NAME=node
NODE_ENV=development
```

### 3. TypeORM CLI 설정
TypeORM CLI는 `ormconfig.ts` 파일을 사용하여 설정됩니다.

## 사용법

### 마이그레이션 명령어

#### 데이터베이스 초기화
```bash
# 빌드 후 마이그레이션 실행
npm run db:init

# 데이터베이스 완전 초기화 (주의: 모든 데이터 삭제)
npm run db:reset
```

#### 마이그레이션 관리
```bash
# 새 마이그레이션 생성
npm run typeorm:migration:create -- src/migrations/AddNewTable

# 엔티티 변경사항으로부터 마이그레이션 자동 생성
npm run typeorm:migration:generate -- src/migrations/UpdateUserTable

# 마이그레이션 실행
npm run typeorm:migration:run

# 마이그레이션 되돌리기
npm run typeorm:migration:revert
```

#### 스키마 관리
```bash
# 스키마 동기화 (개발환경에서만)
npm run typeorm:schema:sync

# 스키마 삭제 (주의!)
npm run typeorm:schema:drop
```

### API 엔드포인트

마이그레이션 컨트롤러를 통해 다음 API를 사용할 수 있습니다:

#### 데이터베이스 관리
```bash
# 데이터베이스 초기화
POST http://localhost:3001/api/migration/init

# 마이그레이션 실행
POST http://localhost:3001/api/migration/run

# 마이그레이션 되돌리기
POST http://localhost:3001/api/migration/revert

# 데이터베이스 상태 확인
GET http://localhost:3001/api/migration/status
```

#### 테스트 데이터 관리
```bash
# 테스트 데이터 생성
POST http://localhost:3001/api/migration/seed
# 또는
npm run db:seed

# 테스트 데이터 삭제
DELETE http://localhost:3001/api/migration/clear
```

#### 마이그레이션 테스트 및 검증
```bash
# 마이그레이션 상태 확인
GET http://localhost:3001/api/migration/migrations
# 또는
npm run db:status

# 사용자 데이터 검증
GET http://localhost:3001/api/migration/validate-users
# 또는
npm run db:validate

# 마이그레이션 테스트 실행
POST http://localhost:3001/api/migration/test
# 또는
npm run db:test

# 완전한 데이터베이스 테스트
POST http://localhost:3001/api/migration/full-test
# 또는
npm run db:full-test

# 특정 마이그레이션까지 실행
POST http://localhost:3001/api/migration/run-to/AddTestUsers1722000001000
```

#### 스키마 동기화 (개발환경에서만)
```bash
# 스키마 동기화
POST http://localhost:3001/api/migration/sync
```

### 테스트 실행

#### 단위 테스트
```bash
# 전체 테스트 실행
npm run test

# 데이터베이스 관련 테스트만 실행
npm run test:db

# 테스트 커버리지 확인
npm run test:cov
```

#### E2E 테스트
```bash
npm run test:e2e
```

## 프로젝트 구조

```
src/
├── database/
│   ├── database.module.ts         # 데이터베이스 모듈
│   ├── database.service.ts        # 마이그레이션 서비스
│   ├── database.service.spec.ts   # 서비스 테스트
│   ├── test-data.service.ts       # 테스트 데이터 서비스
│   ├── test-data.service.spec.ts  # 테스트 데이터 서비스 테스트
│   └── migration.controller.ts    # 마이그레이션 API 컨트롤러
├── migrations/                    # 마이그레이션 파일들
│   └── 1722000000000-InitialMigration.ts
├── auth/
│   └── entities/
│       └── user.entity.ts         # 사용자 엔티티 (업데이트됨)
└── ...
ormconfig.ts                       # TypeORM 설정
```

## 개발 워크플로우

### 1. 새로운 엔티티 추가
1. 엔티티 파일 생성 (`src/auth/entities/`)
2. 엔티티를 모듈에 등록
3. 마이그레이션 생성: `npm run typeorm:migration:generate -- src/migrations/AddNewEntity`
4. 마이그레이션 실행: `npm run typeorm:migration:run`

### 2. 기존 엔티티 수정
1. 엔티티 파일 수정
2. 마이그레이션 생성: `npm run typeorm:migration:generate -- src/migrations/UpdateEntity`
3. 마이그레이션 실행: `npm run typeorm:migration:run`

### 3. 테스트 데이터 관리
1. 개발 시작 시: `npm run db:seed`
2. 테스트 전: `npm run db:reset && npm run db:seed`
3. 테스트 후: `npm run test`

## 주의사항

### 프로덕션 환경
- `synchronize: false`로 설정되어 있어 자동 스키마 동기화 비활성화
- 마이그레이션을 통해서만 스키마 변경
- 환경 변수를 통한 설정 관리

### 보안
- 데이터베이스 자격 증명을 환경 변수로 관리
- 프로덕션에서는 스키마 동기화 API 비활성화
- 비밀번호는 bcrypt로 해싱

### 테스트
- 각 서비스에 대한 단위 테스트 포함
- 테스트 격리를 위한 모킹 사용
- 데이터베이스 상태 검증

## 문제 해결

### 마이그레이션 오류
```bash
# 마이그레이션 상태 확인
npm run typeorm:migration:show

# 특정 마이그레이션으로 되돌리기
npm run typeorm:migration:revert
```

### 데이터베이스 연결 오류
1. MySQL 서버 실행 상태 확인
2. 환경 변수 설정 확인
3. 데이터베이스 존재 여부 확인

### 테스트 실패
1. 데이터베이스 초기화: `npm run db:reset`
2. 의존성 재설치: `npm install`
3. 테스트 재실행: `npm run test`
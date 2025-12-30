import { Injectable, BadRequestException } from '@nestjs/common';
import * as mysql from 'mysql2';
import { RegisterDto } from '../../auth/register/register.dto/register.dto'; // RegisterDto 임포트
import { LoginDto } from '../../auth/login/login.dto/login.dto'; // LoginDto 임포트
import * as bcrypt from 'bcrypt'; // 비밀번호 암호화용 bcrypt

@Injectable()
export class UserService {
  private connection;

  constructor() {
    // MySQL 연결 설정 (환경변수 사용, fallback 제거로 보안 강화)
    this.connection = mysql.createConnection({
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      user: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_NAME!,
    });
  }

  // 아이디 중복 검사
  async checkUsernameDuplicate(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.connection.execute(
        'SELECT * FROM users WHERE userId = ?',
        [userId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length === 0);
        },
      );
    });
  }

  // 회원가입
  async signup(registerDto: RegisterDto): Promise<any> {
    const { userId, password, name, email, phone } = registerDto;

    // 패스워드 정책 검증: 대소문자, 숫자, 특수문자 각 1개 이상, 8~10자
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/;
    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        '패스워드는 8~10자이며, 대문자, 소문자, 숫자, 특수문자(@$!%*?&)를 각각 1개 이상 포함해야 합니다.'
      );
    }

    // 패스워드 해시화 (bcrypt, salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      this.connection.execute(
        'INSERT INTO users (userId, password, name, email, phone) VALUES (?, ?, ?, ?, ?)',
        [userId, hashedPassword, name, email, phone],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        },
      );
    });
  }

  // 로그인
  async login(loginDto: LoginDto): Promise<{ success: boolean; user?: any; message?: string }> {
    const { userId, password } = loginDto;

    // 유저 정보 조회
    return new Promise((resolve, reject) => {
      this.connection.execute(
        'SELECT * FROM users WHERE userId= ?',
        [userId],
        async (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) return resolve({ success: false, message: '사용자를 찾을 수 없습니다.' });

          const user = results[0];

          // ⭐ 1. 계정 잠금 확인
          if (user.login_locked_until) {
            const lockedUntil = new Date(user.login_locked_until);
            const now = new Date();

            if (now < lockedUntil) {
              // 아직 잠금 상태
              const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
              return resolve({
                success: false,
                message: `로그인 5회 실패로 계정이 잠겼습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`
              });
            } else {
              // 잠금 시간 경과 - 카운터 초기화
              await new Promise((resolveReset, rejectReset) => {
                this.connection.execute(
                  'UPDATE users SET failed_login_attempts = 0, login_locked_until = NULL WHERE userId = ?',
                  [userId],
                  (errReset) => {
                    if (errReset) return rejectReset(errReset);
                    resolveReset(true);
                  }
                );
              });
            }
          }

          let isPasswordValid = false;

          // 평문 패스워드 자동 마이그레이션 로직
          // bcrypt 해시는 $2a$, $2b$, $2y$로 시작
          const isBcryptHash = /^\$2[aby]\$/.test(user.password);

          if (isBcryptHash) {
            // 이미 해시화된 패스워드: bcrypt.compare 사용
            isPasswordValid = await bcrypt.compare(password, user.password);
          } else {
            // 평문 패스워드 감지: 자동 마이그레이션
            console.log(`[마이그레이션] 평문 패스워드 감지: ${userId}`);

            if (password === user.password) {
              isPasswordValid = true;

              // 패스워드 해시화 및 업데이트
              const hashedPassword = await bcrypt.hash(password, 10);
              await new Promise((resolveUpdate, rejectUpdate) => {
                this.connection.execute(
                  'UPDATE users SET password = ? WHERE userId = ?',
                  [hashedPassword, userId],
                  (errUpdate) => {
                    if (errUpdate) {
                      console.error(`[마이그레이션 실패] ${userId}:`, errUpdate);
                      return rejectUpdate(errUpdate);
                    }
                    console.log(`[마이그레이션 완료] ${userId}: 패스워드 해시화 완료`);
                    resolveUpdate(true);
                  }
                );
              });
            }
          }

          // ⭐ 2. 패스워드 검증 결과에 따른 처리
          if (isPasswordValid) {
            // ⭐ 로그인 성공 - 실패 카운터 초기화
            await new Promise((resolveReset, rejectReset) => {
              this.connection.execute(
                'UPDATE users SET failed_login_attempts = 0, login_locked_until = NULL WHERE userId = ?',
                [userId],
                (errReset) => {
                  if (errReset) {
                    console.error(`[실패 카운터 초기화 실패] ${userId}:`, errReset);
                    return rejectReset(errReset);
                  }
                  resolveReset(true);
                }
              );
            });

            resolve({
              success: true,
              user: {
                userId: user.userId,
                mbrId: user.mbrId,
                name: user.name,
                email: user.email,
                point: user.point || 0
              },
            });
          } else {
            // ⭐ 로그인 실패 - 실패 카운터 증가
            const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
            const now = new Date();

            if (newFailedAttempts >= 5) {
              // 5회 이상 실패 - 30분 잠금
              const lockUntil = new Date(now.getTime() + 30 * 60 * 1000); // 30분 후

              await new Promise((resolveLock, rejectLock) => {
                this.connection.execute(
                  'UPDATE users SET failed_login_attempts = ?, last_failed_login_at = ?, login_locked_until = ? WHERE userId = ?',
                  [newFailedAttempts, now, lockUntil, userId],
                  (errLock) => {
                    if (errLock) {
                      console.error(`[계정 잠금 실패] ${userId}:`, errLock);
                      return rejectLock(errLock);
                    }
                    console.log(`[계정 잠금] ${userId}: 5회 실패로 30분 잠금`);
                    resolveLock(true);
                  }
                );
              });

              resolve({
                success: false,
                message: '로그인 5회 실패로 계정이 30분간 잠겼습니다.'
              });
            } else {
              // 5회 미만 실패 - 카운터만 증가
              await new Promise((resolveUpdate, rejectUpdate) => {
                this.connection.execute(
                  'UPDATE users SET failed_login_attempts = ?, last_failed_login_at = ? WHERE userId = ?',
                  [newFailedAttempts, now, userId],
                  (errUpdate) => {
                    if (errUpdate) {
                      console.error(`[실패 카운터 업데이트 실패] ${userId}:`, errUpdate);
                      return rejectUpdate(errUpdate);
                    }
                    resolveUpdate(true);
                  }
                );
              });

              const remainingAttempts = 5 - newFailedAttempts;
              resolve({
                success: false,
                message: `비밀번호가 일치하지 않습니다. (${remainingAttempts}회 남음)`
              });
            }
          }
        },
      );
    });
  }
}

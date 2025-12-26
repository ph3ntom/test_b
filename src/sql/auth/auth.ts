import { Injectable, BadRequestException } from '@nestjs/common';
import * as mysql from 'mysql2';
import { RegisterDto } from '../../auth/register/register.dto/register.dto'; // RegisterDto 임포트
import { LoginDto } from '../../auth/login/login.dto/login.dto'; // LoginDto 임포트
import * as bcrypt from 'bcrypt'; // 비밀번호 암호화용 bcrypt

@Injectable()
export class UserService {
  private connection;

  constructor() {
    // MySQL 연결 설정
    this.connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'ehy1123?',
      database: 'node',
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
  async login(loginDto: LoginDto): Promise<{ success: boolean; user?: any }> {
    const { userId, password } = loginDto;

    // 유저 정보 조회
    return new Promise((resolve, reject) => {
      this.connection.execute(
        'SELECT * FROM users WHERE userId= ?',
        [userId],
        async (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) return resolve({ success: false });

          const user = results[0];
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

          if (isPasswordValid) {
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
            resolve({ success: false });
          }
        },
      );
    });
  }
}

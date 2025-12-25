import { Injectable } from '@nestjs/common';
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

    //const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      this.connection.execute(
        'INSERT INTO users (userId, password, name, email, phone) VALUES (?, ?, ?, ?, ?)',
        [userId, password, name, email, phone],
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
          //const isPasswordValid = await bcrypt.compare(password, user.password);
          const isPasswordValid = password === user.password;

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

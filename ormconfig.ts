import { DataSource } from 'typeorm';
import { User } from './src/auth/entities/user.entity';
import { Question } from './src/question/entities/question.entity';
import { Answer } from './src/question/entities/answer.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'ehy1123?',
  database: process.env.DB_NAME || 'node',
  entities: [User, Question, Answer],
  migrations: ['src/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  migrationsRun: false,
  migrationsTableName: 'migrations_history',
});
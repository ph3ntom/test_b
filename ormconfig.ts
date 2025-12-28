import { DataSource } from 'typeorm';
import { User } from './src/auth/entities/user.entity';
import { Question } from './src/question/entities/question.entity';
import { Answer } from './src/question/entities/answer.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  entities: [User, Question, Answer],
  synchronize: false,
  logging: true,
});
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsPhoneNumber,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  private _userId: string;
  private _password: string;
  private _name: string;
  private _email: string;
  private _phone: string;
  private _checkIdPerformed: boolean;

  @IsString()
  @IsNotEmpty()
  get userId(): string {
    return this._userId;
  }
  set userId(value: string) {
    this._userId = value;
  }

  @IsString()
  @IsNotEmpty()
  get password(): string {
    return this._password;
  }
  set password(value: string) {
    this._password = value;
  }

  @IsString()
  @IsNotEmpty()
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
  }

  @IsEmail()
  @IsNotEmpty()
  get email(): string {
    return this._email;
  }
  set email(value: string) {
    this._email = value;
  }

  @IsPhoneNumber('KR')
  @IsNotEmpty()
  get phone(): string {
    return this._phone;
  }
  set phone(value: string) {
    this._phone = value;
  }

  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  get checkIdPerformed(): boolean {
    return this._checkIdPerformed;
  }
  set checkIdPerformed(value: boolean) {
    this._checkIdPerformed = value;
  }
}

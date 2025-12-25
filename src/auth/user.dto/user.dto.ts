import {
  IsString,
  IsInt,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
} from 'class-validator';

export enum UserRole {
  USER = 0,
  ADMIN = 1,
  RELATIONSHIP_MANAGER = 2,
}

export class UserDto {
  private _mbrId: number;
  private _userId: string;
  private _password: string;
  private _name: string;
  private _email: string;
  private _phone: string;
  private _role: UserRole;

  @IsInt()
  get mbrId(): number {
    return this._mbrId;
  }
  set mbrId(value: number) {
    this._mbrId = value;
  }

  @IsString()
  get userId(): string {
    return this._userId;
  }
  set userId(value: string) {
    this._userId = value;
  }

  @IsString()
  get password(): string {
    return this._password;
  }
  set password(value: string) {
    this._password = value;
  }

  @IsString()
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
  }

  @IsEmail()
  get email(): string {
    return this._email;
  }
  set email(value: string) {
    this._email = value;
  }

  @IsPhoneNumber()
  get phone(): string {
    return this._phone;
  }
  set phone(value: string) {
    this._phone = value;
  }

  @IsEnum(UserRole)
  get role(): UserRole {
    return this._role;
  }
  set role(value: UserRole) {
    this._role = value;
  }
}

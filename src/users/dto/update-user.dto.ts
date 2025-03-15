import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
} 
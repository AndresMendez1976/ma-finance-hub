import { IsString, IsNotEmpty, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  external_subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  display_name!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}

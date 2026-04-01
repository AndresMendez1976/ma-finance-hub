import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsEmail, Min, MaxLength, MinLength, IsOptional } from 'class-validator';
import { LoginService } from './login.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tenant_id?: number;
}

class MfaValidateDto {
  @IsString()
  @IsNotEmpty()
  mfa_session_token!: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  backup_code?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto.email, dto.password, dto.tenant_id);
  }

  @Post('mfa/validate')
  async validateMfa(@Body() dto: MfaValidateDto) {
    return this.loginService.validateMfa(dto.mfa_session_token, dto.token, dto.backup_code);
  }
}

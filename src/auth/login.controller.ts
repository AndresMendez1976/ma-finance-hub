import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsEmail, Min, MaxLength, MinLength } from 'class-validator';
import { LoginService } from './login.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @IsInt()
  @Min(1)
  tenant_id!: number;
}

@ApiTags('Auth')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto.email, dto.password, dto.tenant_id);
  }
}

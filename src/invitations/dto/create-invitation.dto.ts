import { IsString, IsNotEmpty, IsEmail, IsIn, IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['owner', 'admin', 'manager', 'analyst', 'viewer'])
  role!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['internal', 'external'])
  user_type!: string;

  @IsOptional()
  @IsString()
  @IsIn(['accountant', 'auditor', 'consultant', 'vendor', 'client'])
  external_type?: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expires_in_days?: number;
}

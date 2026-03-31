import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateMembershipDto {
  @IsOptional()
  @IsString()
  @IsIn(['owner', 'admin', 'manager', 'analyst', 'viewer'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

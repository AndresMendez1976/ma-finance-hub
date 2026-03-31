import { IsString, IsOptional, IsBoolean, IsInt, MaxLength, Min } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  parent_account_id?: number | null;
}

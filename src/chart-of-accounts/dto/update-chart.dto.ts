import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateChartDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

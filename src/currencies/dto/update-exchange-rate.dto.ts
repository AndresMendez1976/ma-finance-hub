// DTO for updating an exchange rate
import { IsString, IsNumber, IsDateString, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateExchangeRateDto {
  @IsOptional()
  @IsString()
  @MaxLength(3)
  from_currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  to_currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsDateString()
  effective_date?: string;
}

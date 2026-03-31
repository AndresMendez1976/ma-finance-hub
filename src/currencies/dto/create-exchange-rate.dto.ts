// DTO for creating an exchange rate
import { IsString, IsNumber, IsDateString, MaxLength, Min } from 'class-validator';

export class CreateExchangeRateDto {
  @IsString()
  @MaxLength(3)
  from_currency!: string;

  @IsString()
  @MaxLength(3)
  to_currency!: string;

  @IsNumber()
  @Min(0)
  rate!: number;

  @IsDateString()
  effective_date!: string;
}

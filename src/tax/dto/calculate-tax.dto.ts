// DTO for tax calculation request
import { IsNumber, Min } from 'class-validator';

export class CalculateTaxDto {
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @IsNumber()
  tax_rate_id!: number;
}

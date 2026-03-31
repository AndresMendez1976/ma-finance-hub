// DTO for posting an expense to the journal
import { IsNumber, IsOptional } from 'class-validator';

export class PostExpenseDto {
  @IsNumber()
  fiscal_period_id!: number;

  @IsOptional()
  @IsNumber()
  payment_account_id?: number;
}

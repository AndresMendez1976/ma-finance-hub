// DTO for creating a change order
import { IsString, IsOptional, IsNumber, IsDateString, MaxLength } from 'class-validator';

export class CreateChangeOrderDto {
  @IsNumber()
  project_id!: number;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsDateString()
  date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsNumber()
  cost_code_id?: number;
}

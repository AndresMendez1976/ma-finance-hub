// DTO for creating a cost code
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateCostCodeDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  parent_id?: number;
}

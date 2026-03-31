// DTO for creating a new tracking dimension value
import { IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';

export class CreateValueDto {
  @IsString()
  @MaxLength(255)
  value!: string;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

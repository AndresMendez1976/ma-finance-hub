// DTO for creating a new tracking dimension
import { IsString, MaxLength } from 'class-validator';

export class CreateDimensionDto {
  @IsString()
  @MaxLength(100)
  name!: string;
}

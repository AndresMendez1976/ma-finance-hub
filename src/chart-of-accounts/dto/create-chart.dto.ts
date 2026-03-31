import { IsString, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateChartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

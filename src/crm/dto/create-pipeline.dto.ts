// DTO for creating a CRM pipeline with stages
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PipelineStageDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  sort_order!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  probability?: number;
}

export class CreatePipelineDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineStageDto)
  stages!: PipelineStageDto[];
}

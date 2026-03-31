import { Type } from 'class-transformer';
import {
  IsInt, IsOptional, IsString, IsNumber, IsArray,
  ValidateNested, ArrayMinSize, MaxLength, Min,
} from 'class-validator';

export class JournalLineDto {
  @IsInt()
  @Min(1)
  account_id!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  debit!: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  credit!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateJournalEntryDto {
  @IsInt()
  @Min(1)
  fiscal_period_id!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  memo?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

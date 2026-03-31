import { IsString, IsNotEmpty, IsInt, IsOptional, IsIn, MaxLength, Min } from 'class-validator';

export class CreateAccountDto {
  @IsInt()
  @Min(1)
  chart_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  account_code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
  account_type!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parent_account_id?: number;
}

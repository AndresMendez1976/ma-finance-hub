// DTO for creating a new bank rule
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, MaxLength, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class RuleConditionDto {
  @IsString()
  @IsIn(['description', 'amount', 'type'])
  field!: string;

  @IsString()
  @IsIn(['contains', 'equals', 'greater_than', 'less_than'])
  operator!: string;

  @IsString()
  @MaxLength(500)
  value!: string;
}

export class CreateBankRuleDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsNumber()
  @Min(0)
  priority!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions!: RuleConditionDto[];

  @IsNumber()
  action_account_id!: number;

  @IsOptional()
  @IsNumber()
  action_contact_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  action_category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  action_memo?: string;

  @IsOptional()
  @IsBoolean()
  auto_approve?: boolean;
}

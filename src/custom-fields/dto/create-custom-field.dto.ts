// DTO for creating a new custom field definition
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsIn, MaxLength } from 'class-validator';

export class CreateCustomFieldDto {
  @IsString()
  @IsIn(['contact', 'invoice', 'expense', 'estimate', 'product', 'journal_entry', 'project'])
  entity_type!: string;

  @IsString()
  @MaxLength(100)
  field_name!: string;

  @IsString()
  @MaxLength(255)
  field_label!: string;

  @IsString()
  @IsIn(['text', 'number', 'boolean', 'date', 'select', 'textarea', 'url', 'email'])
  field_type!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  select_options?: string[];

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

// DTO for creating/updating a document template
import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsIn(['invoice', 'estimate', 'purchase_order', 'credit_note'])
  document_type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['classic', 'modern', 'minimal'])
  layout?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  primary_color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  secondary_color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  font?: string;

  @IsOptional()
  @IsBoolean()
  show_logo?: boolean;

  @IsOptional()
  @IsBoolean()
  show_company_address?: boolean;

  @IsOptional()
  @IsBoolean()
  show_company_phone?: boolean;

  @IsOptional()
  @IsBoolean()
  show_company_email?: boolean;

  @IsOptional()
  @IsBoolean()
  show_tax_id?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  header_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  footer_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  terms_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes_text?: string;

  @IsOptional()
  @IsBoolean()
  show_payment_link?: boolean;

  @IsOptional()
  @IsBoolean()
  show_due_date?: boolean;

  @IsOptional()
  @IsBoolean()
  show_po_number?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['letter', 'a4'])
  paper_size?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateTemplateDto extends CreateTemplateDto {
  // document_type is optional on update
  @IsOptional()
  @IsString()
  @IsIn(['invoice', 'estimate', 'purchase_order', 'credit_note'])
  declare document_type: string;
}

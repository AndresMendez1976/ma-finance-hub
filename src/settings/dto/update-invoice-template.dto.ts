import { IsOptional, IsString, IsBoolean, MaxLength, IsIn } from 'class-validator';

export class UpdateInvoiceTemplateDto {
  @IsOptional()
  @IsString()
  @IsIn(['classic', 'modern', 'minimal'])
  invoice_template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  invoice_color_primary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  invoice_color_secondary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  invoice_footer_text?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  invoice_payment_terms?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  invoice_notes_default?: string | null;

  @IsOptional()
  @IsBoolean()
  show_logo_on_invoice?: boolean;

  @IsOptional()
  @IsBoolean()
  show_company_address?: boolean;

  @IsOptional()
  @IsBoolean()
  show_tax_id?: boolean;
}

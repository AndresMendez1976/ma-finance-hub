// DTO for updating a webhook subscription
import { IsString, IsOptional, IsBoolean, IsArray, IsUrl, MaxLength } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

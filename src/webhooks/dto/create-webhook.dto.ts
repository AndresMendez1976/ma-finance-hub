// DTO for creating a webhook subscription
import { IsString, IsOptional, IsArray, IsUrl, ArrayMinSize, MaxLength } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl()
  url!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

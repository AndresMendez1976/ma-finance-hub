import { IsOptional, IsString, IsBoolean, IsArray, MaxLength } from 'class-validator';

export class UpdateStripeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  stripe_publishable_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  stripe_secret_key?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  stripe_webhook_secret?: string | null;

  @IsOptional()
  @IsBoolean()
  payment_enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_payment_methods?: string[];
}

// DTO for creating an API key
import { IsString, IsArray, MaxLength, ArrayMinSize } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  permissions!: string[];
}

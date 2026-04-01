import { IsString, IsNotEmpty } from 'class-validator';

export class UploadLogoDto {
  @IsString()
  @IsNotEmpty()
  logo_base64!: string;
}

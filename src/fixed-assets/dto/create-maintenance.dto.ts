// DTO for creating a maintenance record
import { IsString, IsOptional, IsNumber, IsDateString, IsIn, MaxLength } from 'class-validator';

export class CreateMaintenanceDto {
  @IsNumber()
  fixed_asset_id!: number;

  @IsString()
  @IsIn(['preventive', 'corrective', 'inspection'])
  maintenance_type!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  scheduled_date!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  cost?: number;

  @IsOptional()
  @IsNumber()
  vendor_contact_id?: number;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

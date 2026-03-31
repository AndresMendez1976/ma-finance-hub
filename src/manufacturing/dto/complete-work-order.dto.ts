// DTO for completing a work order with produced and scrapped quantities
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CompleteWorkOrderDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  quantity_produced!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity_scrapped?: number;
}

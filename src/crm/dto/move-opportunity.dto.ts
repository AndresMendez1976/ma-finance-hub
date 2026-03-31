// DTO for moving an opportunity to a different stage
import { IsNumber } from 'class-validator';

export class MoveOpportunityDto {
  @IsNumber()
  stage_id!: number;
}

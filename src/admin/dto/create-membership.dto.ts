import { IsInt, IsString, IsIn, Min } from 'class-validator';

export class CreateMembershipDto {
  @IsInt()
  @Min(1)
  user_id!: number;

  @IsString()
  @IsIn(['owner', 'admin', 'manager', 'analyst', 'viewer'])
  role!: string;
}

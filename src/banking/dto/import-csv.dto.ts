// DTO for CSV import body
import { IsString } from 'class-validator';

export class ImportCsvDto {
  @IsString()
  csv!: string;
}

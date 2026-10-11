import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateBatchDto {
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsInt()
  @Min(1)
  @Max(50000)
  count: number;

  @IsOptional()
  mfgDate?: string;

  @IsOptional()
  expDate?: string;
}

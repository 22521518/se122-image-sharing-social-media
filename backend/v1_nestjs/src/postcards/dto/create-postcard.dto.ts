import { IsOptional, IsString, IsUUID, IsDateString, IsNumber, ValidateIf, IsNotEmpty, Min, Max } from 'class-validator';

export class CreatePostcardDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsUUID()
  recipientId?: string; // Defaults to self if not provided

  // XOR validation: exactly ONE of unlockDate OR (unlockLatitude + unlockLongitude) must be set
  // Enforced at service layer

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => !o.unlockLatitude && !o.unlockLongitude)
  unlockDate?: string; // ISO date string

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ValidateIf((o) => !o.unlockDate)
  unlockLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ValidateIf((o) => !o.unlockDate)
  unlockLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  unlockRadius?: number; // Default 50m, range 10m-1000m
}

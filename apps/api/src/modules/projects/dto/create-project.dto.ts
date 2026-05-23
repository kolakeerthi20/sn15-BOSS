import {
  IsString, IsOptional, IsDateString,
  IsNumber, IsEnum, IsArray, MaxLength, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Coerce empty strings / null to undefined so @IsOptional() skips them
const emptyToUndefined = Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class CreateProjectDto {
  @ApiProperty({ example: 'E-Commerce Redesign' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'ECP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'clientId must be a valid UUID' })
  clientId?: string;

  @ApiPropertyOptional({ enum: ['planning','active','on_hold'] })
  @IsOptional()
  @IsEnum(['planning', 'active', 'on_hold'])
  status?: string;

  @ApiPropertyOptional({ enum: ['low','medium','high','critical'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @Matches(UUID_PATTERN, { each: true, message: 'each memberIds entry must be a valid UUID' })
  memberIds?: string[];
}

import { IsString, IsOptional, IsDateString, IsNumber, IsEnum, IsArray, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Accepts standard v4 UUIDs and also seed/test UUIDs (any version nibble)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_MSG = 'must be a valid UUID';

// Coerce empty strings / null to undefined so @IsOptional() skips validation
const emptyToUndefined = Transform(({ value }) => (value === '' || value === null ? undefined : value));

export class CreateTaskDto {
  @ApiProperty()
  @Matches(UUID_PATTERN, { message: `projectId ${UUID_MSG}` })
  projectId: string;

  @ApiProperty({ example: 'Implement login page' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_PATTERN, { message: `sprintId ${UUID_MSG}` })
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_PATTERN, { message: `milestoneId ${UUID_MSG}` })
  milestoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_PATTERN, { message: `parentTaskId ${UUID_MSG}` })
  parentTaskId?: string;

  @ApiPropertyOptional({ enum: ['not_started','in_progress','blocked','in_review','completed'] })
  @IsOptional()
  @IsEnum(['not_started','in_progress','blocked','in_review','completed','cancelled'])
  status?: string;

  @ApiPropertyOptional({ enum: ['low','medium','high','critical'] })
  @IsOptional()
  @IsEnum(['low','medium','high','critical'])
  priority?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @Matches(UUID_PATTERN, { message: `assigneeId ${UUID_MSG}` })
  assigneeId?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional()
  @emptyToUndefined
  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  labels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;
}

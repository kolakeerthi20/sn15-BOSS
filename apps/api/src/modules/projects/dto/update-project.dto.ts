import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsOptional, IsEnum } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsEnum(['on_track', 'at_risk', 'off_track', 'unknown'])
  health?: string;

  @IsOptional()
  ownerId?: string;
}

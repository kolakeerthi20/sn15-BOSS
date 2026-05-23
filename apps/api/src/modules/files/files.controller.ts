import {
  Controller, Post, Get, Delete, Param, UseGuards,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Files')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post(':entityType/:entityId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.uploadFile(tenantId, userId, entityType, entityId, file);
  }

  @Get(':entityType/:entityId')
  getFiles(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.filesService.getFiles(entityType, entityId);
  }

  @Delete(':id')
  deleteFile(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.filesService.deleteFile(id, tenantId);
  }
}

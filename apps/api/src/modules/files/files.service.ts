import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FilesService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    file: Express.Multer.File,
  ) {
    const storageKey = `${tenantId}/${entityType}/${entityId}/${Date.now()}-${file.originalname}`;
    const destPath = path.join(this.uploadDir, storageKey);
    const dir = path.dirname(destPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(destPath, file.buffer);

    return this.db.queryOne(
      `INSERT INTO files
         (tenant_id, entity_type, entity_id, uploaded_by,
          filename, original_name, mime_type, size_bytes, storage_key, storage_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        tenantId, entityType, entityId, userId,
        path.basename(storageKey), file.originalname,
        file.mimetype, file.size, storageKey,
        `/api/v1/files/${storageKey}`,
      ],
    );
  }

  async getFiles(entityType: string, entityId: string) {
    return this.db.queryMany(
      `SELECT f.*, u.first_name || ' ' || u.last_name AS uploader_name
       FROM files f JOIN users u ON u.id = f.uploaded_by
       WHERE f.entity_type = $1 AND f.entity_id = $2 AND f.is_deleted = false
       ORDER BY f.created_at DESC`,
      [entityType, entityId],
    );
  }

  async deleteFile(fileId: string, tenantId: string) {
    await this.db.query(
      'UPDATE files SET is_deleted = true WHERE id = $1 AND tenant_id = $2',
      [fileId, tenantId],
    );
  }
}

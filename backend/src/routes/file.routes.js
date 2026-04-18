import { Router } from 'express';
import {
  uploadFile,
  getFilesByRoom,
  downloadFile,
  deleteFile,
  createFileVersion,
  getFileVersions,
  getFileLink
} from '../controllers/file.controller.js';

const router = Router();

// POST   /api/files/upload              → upload file
// GET    /api/files/download/:fileId    → download file
// GET    /api/files/:fileId/versions    → version history
// GET    /api/files/:roomId             → get files in room
// GET    /api/files/:roomId?search=auth → search files
// DELETE /api/files/:fileId             → delete file

router.post('/upload', uploadFile);
router.post('/:fileId/version', createFileVersion);

router.get('/download/:fileId', downloadFile);
router.get('/link/:fileId', getFileLink);   

router.get('/:fileId/versions', getFileVersions);
router.get('/:roomId', getFilesByRoom);

router.delete('/:fileId', deleteFile);

export default router;

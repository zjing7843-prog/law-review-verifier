import { Router } from 'express';
import multer from 'multer';
import { storagePut } from './storage.js';
import { nanoid } from 'nanoid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique file key
    const fileExtension = req.file.originalname.split('.').pop();
    const fileKey = `documents/${nanoid()}.${fileExtension}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ fileUrl: url, fileKey });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;

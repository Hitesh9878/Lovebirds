// src/routes/uploadRoutes.js - Complete version
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with timestamp
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/mpeg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/mpeg',
    'audio/webm', // Add this for voice messages
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
};

// Configure multer with limits
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Error handler for multer
const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                message: 'File too large. Maximum size is 50MB.' 
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                message: 'Too many files uploaded.' 
            });
        }
    }
    if (err) {
        return res.status(400).json({ 
            message: err.message || 'File upload error' 
        });
    }
    next();
};

// Upload endpoint
router.post('/', upload.single('file'), multerErrorHandler, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                message: 'No file uploaded.' 
            });
        }

        // Construct the file URL - make it accessible from frontend
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        console.log('✅ File uploaded successfully:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            url: fileUrl
        });

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            fileUrl,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            message: 'Failed to process file upload',
            error: error.message 
        });
    }
});

export default router;
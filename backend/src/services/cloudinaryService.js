// services/cloudinaryService.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage - enforce JPG format
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'lovebirds/avatars',
        format: async () => 'jpg', // Always convert to JPG
        public_id: (req, file) => `avatar_${Date.now()}`,
    },
});

// Configure multer with file filter and 100MB limit
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
            cb(null, true);
        } else {
            cb(new Error('Only JPG images are allowed'), false);
        }
    }
});

// Direct upload function with JPG enforcement
export const uploadToCloudinary = async (file) => {
    try {
        const result = await cloudinary.uploader.upload(file.tempFilePath || file.path, {
            folder: 'lovebirds/avatars',
            transformation: [
                { width: 500, height: 500, crop: 'limit' },
                { quality: 'auto' },
                { format: 'jpg' } // Force JPG format
            ]
        });
        return result;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image');
    }
};

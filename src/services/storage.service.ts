import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: any) => {
    let folder = 'peace-civic/others';
    let resource_type = 'auto';
    
    if (file.fieldname === 'plan_file') {
        folder = 'peace-civic/plans';
        resource_type = 'raw'; 
    } else if (file.fieldname === 'report_files') {
        folder = 'peace-civic/reports';
        resource_type = 'auto'; 
    } else if (file.fieldname === 'badge_icon') {
        folder = 'peace-civic/badges';
        resource_type = 'image'; 
    } else if (file.fieldname === 'avatar') {
        folder = 'peace-civic/avatars';
        resource_type = 'image';
    }

    return {
      folder: folder,
      resource_type: resource_type,
      access_mode: 'public',
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

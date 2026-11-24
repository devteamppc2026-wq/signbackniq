const mediaId = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
export const localPhotoPath = new RegExp(`^/uploads/(?:cloud/)?${mediaId}\\.webp$`);
export const localVideoPath = new RegExp(`^/uploads/cloud/${mediaId}\\.mp4$`);
export const cloudFilename = new RegExp(`^(${mediaId})\\.(webp|mp4)$`);

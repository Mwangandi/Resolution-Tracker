import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.avif']);

export function isImageFile(fileName?: string, mimeType?: string): boolean {
  if (mimeType && mimeType.toLowerCase().startsWith('image/')) {
    return true;
  }
  if (fileName && fileName.includes('.')) {
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      return true;
    }
  }
  return false;
}

export function sanitizeFileName(name: string): string {
  if (!name) return 'file_' + Date.now();
  // Strip path traversal attempts and invalid path characters
  const basename = path.basename(name);
  const sanitized = basename.replace(/[^a-zA-Z0-9_.\-\s()]/g, '_');
  return sanitized || 'file_' + Date.now();
}

export function savePayloadToDisk(payload: string | undefined | null, originalFileName?: string): string {
  if (!payload || payload === '#') {
    return payload || '#';
  }

  // If already saved in /Private/ or external HTTP URL, return normalized URL
  if (payload.startsWith('/Private/') || payload.startsWith('Private/') || payload.startsWith('http://') || payload.startsWith('https://')) {
    return payload.startsWith('Private/') ? `/${payload}` : payload;
  }

  // Handle base64 Data URIs
  if (payload.startsWith('data:')) {
    try {
      const matches = payload.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.*)$/);
      let mimeType = '';
      let base64Data = '';

      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        const parts = payload.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        base64Data = parts[1] || '';
      }

      if (!base64Data) {
        return payload;
      }

      const isImg = isImageFile(originalFileName, mimeType);
      const subFolder = isImg ? 'Private/images' : 'Private/files';
      const targetDir = path.resolve(process.cwd(), subFolder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      let rawName = originalFileName || (isImg ? 'image' : 'file');
      if (!rawName.includes('.')) {
        let ext = 'bin';
        if (mimeType.includes('pdf')) ext = 'pdf';
        else if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
        else if (mimeType.includes('word') || mimeType.includes('docx')) ext = 'docx';
        else if (mimeType.includes('excel') || mimeType.includes('xlsx')) ext = 'xlsx';
        else if (isImg) ext = 'png';
        rawName = `${rawName}.${ext}`;
      }

      let cleanName = sanitizeFileName(rawName);
      let filePath = path.join(targetDir, cleanName);

      // Handle duplicate filename collisions
      if (fs.existsSync(filePath)) {
        const ext = path.extname(cleanName);
        const nameWithoutExt = path.basename(cleanName, ext);
        cleanName = `${nameWithoutExt}_${Date.now()}${ext}`;
        filePath = path.join(targetDir, cleanName);
      }

      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      const relativeUrl = `/${subFolder}/${cleanName}`;
      return relativeUrl;
    } catch (err) {
      console.error('[FileStorageUtil] Error saving payload to disk:', err);
      return payload;
    }
  }

  return payload;
}

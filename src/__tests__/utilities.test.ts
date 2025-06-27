import { isTextFile, formatFileSize, sanitizeFolderId } from '../utilities';

describe('Utilities', () => {
  describe('isTextFile', () => {
    it('should return true for text file extensions', () => {
      expect(isTextFile('document.txt')).toBe(true);
      expect(isTextFile('README.md')).toBe(true);
      expect(isTextFile('config.json')).toBe(true);
      expect(isTextFile('style.css')).toBe(true);
      expect(isTextFile('script.js')).toBe(true);
    });

    it('should return false for non-text file extensions', () => {
      expect(isTextFile('image.jpg')).toBe(false);
      expect(isTextFile('video.mp4')).toBe(false);
      expect(isTextFile('archive.zip')).toBe(false);
      expect(isTextFile('document.pdf')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(isTextFile('filename')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });

  describe('sanitizeFolderId', () => {
    it('should convert root folder variations to "0"', () => {
      expect(sanitizeFolderId('root')).toBe('0');
      expect(sanitizeFolderId('0')).toBe('0');
      expect(sanitizeFolderId(0 as any)).toBe('0');
    });

    it('should keep other folder IDs as strings', () => {
      expect(sanitizeFolderId('123456')).toBe('123456');
      expect(sanitizeFolderId(123456 as any)).toBe('123456');
    });
  });
}); 
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageCompressionService {
  readonly allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
  readonly maxOriginalSizeBytes = 5 * 1024 * 1024; // 5 MB vor Kompression

  isTypeAllowed(file: File): boolean {
    return this.allowedTypes.includes(file.type);
  }

  isSizeAllowed(file: File): boolean {
    return file.size <= this.maxOriginalSizeBytes;
  }

  /**
   * Komprimiert ein Bild auf eine Zielgröße/-qualität.
   * @param file Die Bilddatei
   * @param maxWidth Maximale Breite in Pixel
   * @param maxHeight Maximale Höhe in Pixel
   * @param quality JPEG-Qualität (0–1)
   * @returns Base64-String des komprimierten Bildes
   */
  compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Error loading the image.'));
        img.src = event.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Error reading the file.'));
      reader.readAsDataURL(file);
    });
  }
}

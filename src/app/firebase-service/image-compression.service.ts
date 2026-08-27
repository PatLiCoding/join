import { Injectable } from '@angular/core';

/**
 * Provides client-side validation and compression for image uploads.
 * Images are downscaled via an off-screen canvas and re-encoded as JPEG
 * so that large photos can be stored inline (e.g. as base64) without
 * exceeding reasonable size limits.
 */
@Injectable({ providedIn: 'root' })
export class ImageCompressionService {
  /** MIME types accepted by the file picker / validation. */
  readonly allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

  /** Maximum accepted file size in bytes, checked before compression (5 MB). */
  readonly maxOriginalSizeBytes = 5 * 1024 * 1024;

  /**
   * Checks whether a file's MIME type is one of the allowed image types.
   * @param file The file to check.
   * @returns True if the file's type is allowed.
   */
  isTypeAllowed(file: File): boolean {
    return this.allowedTypes.includes(file.type);
  }

  /**
   * Checks whether a file's size is within the allowed limit.
   * @param file The file to check.
   * @returns True if the file size is within maxOriginalSizeBytes.
   */
  isSizeAllowed(file: File): boolean {
    return file.size <= this.maxOriginalSizeBytes;
  }

  /**
   * Compresses an image file to a maximum width/height and JPEG quality.
   * @param file The image file to compress.
   * @param maxWidth Maximum output width in pixels (default 800).
   * @param maxHeight Maximum output height in pixels (default 800).
   * @param quality JPEG encoding quality between 0 and 1 (default 0.7).
   * @returns A promise resolving to a base64-encoded JPEG data URL.
   */
  async compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
    const dataUrl = await this.readFileAsDataUrl(file);
    const img = await this.loadImage(dataUrl);
    const { width, height } = this.calculateScaledDimensions(img, maxWidth, maxHeight);
    return this.drawToCanvas(img, width, height, quality);
  }

  /**
   * Reads a file into memory and resolves with its data URL representation.
   * @param file The file to read.
   * @returns A promise resolving to the file's data URL.
   */
  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = () => reject(new Error('Error reading the file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Loads an image element from a given source URL.
   * @param src The image source (e.g. a data URL).
   * @returns A promise resolving to the loaded HTMLImageElement.
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Error loading the image.'));
      img.src = src;
    });
  }

  /**
   * Calculates output dimensions that fit within maxWidth/maxHeight while
   * preserving the image's aspect ratio. Returns the original size if it
   * already fits within the given bounds.
   * @param img The source image.
   * @param maxWidth Maximum allowed width in pixels.
   * @param maxHeight Maximum allowed height in pixels.
   * @returns The scaled width and height.
   */
  private calculateScaledDimensions(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    let width = img.width;
    let height = img.height;
    if (width <= maxWidth && height <= maxHeight) return { width, height };

    if (width > height) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    } else {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
    return { width, height };
  }

  /**
   * Draws an image onto an off-screen canvas at the given size and encodes
   * the result as a JPEG data URL.
   * @param img The source image.
   * @param width Target canvas width in pixels.
   * @param height Target canvas height in pixels.
   * @param quality JPEG encoding quality between 0 and 1.
   * @returns The resulting base64-encoded JPEG data URL.
   */
  private drawToCanvas(
    img: HTMLImageElement,
    width: number,
    height: number,
    quality: number,
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }
}

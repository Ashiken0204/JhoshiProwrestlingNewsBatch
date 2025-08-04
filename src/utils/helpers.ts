import * as crypto from 'crypto';

export function generateId(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim();
}
/**
 * Validates a file's magic number (file signature) against its declared MIME type.
 * This prevents attackers from disguising malicious files with fake extensions.
 */

/** Known magic numbers mapped to their valid MIME types. */
const MAGIC_NUMBERS: { bytes: number[]; types: string[] }[] = [
  { bytes: [0xff, 0xd8, 0xff], types: ['image/jpeg'] },
  { bytes: [0x89, 0x50, 0x4e, 0x47], types: ['image/png'] },
  { bytes: [0x47, 0x49, 0x46, 0x38], types: ['image/gif'] },
  // WebP: starts with RIFF....WEBP
  { bytes: [0x52, 0x49, 0x46, 0x46], types: ['image/webp'] },
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], types: ['application/pdf'] },
];

/**
 * Reads the first N bytes of a file as a Uint8Array.
 */
function readFileHeader(file: File, length: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, length));
  });
}

/**
 * Check if header bytes start with the given magic number sequence.
 */
function startsWith(header: Uint8Array, magic: number[]): boolean {
  if (header.length < magic.length) return false;
  return magic.every((byte, i) => header[i] === byte);
}

/**
 * Validates that a file's binary signature matches its declared MIME type.
 *
 * @param file - The File object to validate
 * @returns true if the magic number matches the declared type, or if the type is not in the known list
 *
 * @example
 * const valid = await validateFileMagicNumber(file);
 * if (!valid) showError('El archivo no coincide con el tipo declarado');
 */
export async function validateFileMagicNumber(file: File): Promise<boolean> {
  // Only validate types we know about
  const knownEntry = MAGIC_NUMBERS.find((m) => m.types.includes(file.type));
  if (!knownEntry) return true; // Unknown type — skip validation

  try {
    const header = await readFileHeader(file, 8);

    // For WebP: header starts with RIFF, but we also need to check bytes 8-11 for "WEBP"
    if (file.type === 'image/webp') {
      const fullHeader = await readFileHeader(file, 12);
      const riffMatch = startsWith(fullHeader, [0x52, 0x49, 0x46, 0x46]);
      const webpMatch =
        fullHeader.length >= 12 &&
        fullHeader[8] === 0x57 &&  // W
        fullHeader[9] === 0x45 &&  // E
        fullHeader[10] === 0x42 && // B
        fullHeader[11] === 0x50;   // P
      return riffMatch && webpMatch;
    }

    return startsWith(header, knownEntry.bytes);
  } catch {
    // If we can't read the file, fail closed
    return false;
  }
}

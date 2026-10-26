const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_END = 0x06054b50;
const UTF8_FLAG = 0x0800;
const MAX_FILES = 65534;
const MAX_ENTRY_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const crcTable = new Uint32Array(256);

for (let n = 0; n < 256; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  crcTable[n] = value >>> 0;
}

function normalizedName(input) {
  const name = String(input || '').replace(/\\/g, '/');
  if (!name || name.startsWith('/') || name.includes('\0')) throw new Error('Invalid archive file path.');
  const parts = name.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('Archive paths must be relative and cannot contain "." or ".." segments.');
  return parts.join('/');
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

async function crc32Blob(blob) {
  let crc = 0xffffffff;
  const update = bytes => {
    for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  };
  if (blob.stream) {
    const reader = blob.stream().getReader();
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        update(part.value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    update(new Uint8Array(await blob.arrayBuffer()));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeLocalHeader(nameBytes, blobSize, crc, stamp) {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, ZIP_LOCAL, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, UTF8_FLAG, true);
  view.setUint16(8, 0, true); // STORE: audio is already compressed.
  view.setUint16(10, stamp.time, true);
  view.setUint16(12, stamp.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, blobSize, true);
  view.setUint32(22, blobSize, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  return bytes;
}

function makeCentralHeader(nameBytes, blobSize, crc, stamp, localOffset) {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, ZIP_CENTRAL, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, UTF8_FLAG, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, stamp.time, true);
  view.setUint16(14, stamp.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, blobSize, true);
  view.setUint32(24, blobSize, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localOffset, true);
  return bytes;
}

/**
 * Create a ZIP archive without recompressing audio. Ordinary audio codecs are
 * already compressed, so STORE avoids CPU cost and the 33% size overhead of
 * a base64 JSON export.
 */
export async function createZip(entries) {
  if (!Array.isArray(entries) || entries.length > MAX_FILES) throw new Error('Too many files to export.');
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  let totalBytes = 0;
  const stamp = dosDateTime();

  for (const entry of entries) {
    const name = normalizedName(entry && entry.name);
    const nameBytes = encoder.encode(name);
    const data = entry && entry.data;
    const blob = data instanceof Blob ? data : new Blob([data == null ? '' : data]);
    if (blob.size > MAX_ENTRY_BYTES) throw new Error('A recording is too large to export safely: ' + name);
    totalBytes += blob.size;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error('The recording library is too large for a single ZIP export.');
    if (blob.size >= 0xffffffff || localOffset >= 0xffffffff) throw new Error('ZIP64 archives are not supported.');

    const crc = await crc32Blob(blob);
    const localHeader = makeLocalHeader(nameBytes, blob.size, crc, stamp);
    const centralHeader = makeCentralHeader(nameBytes, blob.size, crc, stamp, localOffset);
    localParts.push(localHeader, nameBytes, blob);
    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.byteLength + nameBytes.byteLength + blob.size;
    if (localOffset >= 0xffffffff) throw new Error('ZIP64 archives are not supported.');
  }

  const centralOffset = localOffset;
  const centralSize = centralParts.reduce((size, part) => size + part.byteLength, 0);
  if (centralOffset + centralSize >= 0xffffffff) throw new Error('ZIP64 archives are not supported.');

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, ZIP_END, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}

/**
 * Read ZIP files created here and common ZIP archives using STORE or DEFLATE.
 * Reject encrypted, ZIP64, unsafe, corrupt, and unexpectedly huge entries.
 */
export async function readZip(input) {
  const blob = input instanceof Blob ? input : new Blob([input]);
  if (blob.size < 22) throw new Error('This file is not a valid ZIP archive.');
  const tailStart = Math.max(0, blob.size - 22 - 0xffff);
  const tail = new Uint8Array(await blob.slice(tailStart).arrayBuffer());
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let endIndex = -1;

  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) !== ZIP_END) continue;
    const commentLength = tailView.getUint16(i + 20, true);
    if (i + 22 + commentLength <= tail.length) {
      endIndex = i;
      break;
    }
  }
  if (endIndex < 0) throw new Error('Could not find the ZIP directory. The archive may be damaged.');

  const endView = new DataView(tail.buffer, tail.byteOffset + endIndex, 22);
  const diskNumber = endView.getUint16(4, true);
  const centralDisk = endView.getUint16(6, true);
  const count = endView.getUint16(10, true);
  const centralSize = endView.getUint32(12, true);
  const centralOffset = endView.getUint32(16, true);
  if (diskNumber || centralDisk) throw new Error('Multi-disk ZIP files are not supported.');
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('ZIP64 archives are not supported by this import path.');
  }
  if (count > MAX_FILES || centralOffset + centralSize > blob.size) throw new Error('The ZIP directory is invalid or too large.');

  const centralBytes = await blob.slice(centralOffset, centralOffset + centralSize).arrayBuffer();
  const centralView = new DataView(centralBytes);
  const output = [];
  let cursor = 0;
  let totalUncompressed = 0;

  for (let index = 0; index < count; index++) {
    if (cursor + 46 > centralView.byteLength || centralView.getUint32(cursor, true) !== ZIP_CENTRAL) {
      throw new Error('The ZIP directory contains an invalid entry.');
    }
    const flags = centralView.getUint16(cursor + 8, true);
    const method = centralView.getUint16(cursor + 10, true);
    const expectedCrc = centralView.getUint32(cursor + 16, true);
    const compressedSize = centralView.getUint32(cursor + 20, true);
    const uncompressedSize = centralView.getUint32(cursor + 24, true);
    const nameLength = centralView.getUint16(cursor + 28, true);
    const extraLength = centralView.getUint16(cursor + 30, true);
    const commentLength = centralView.getUint16(cursor + 32, true);
    const localHeaderOffset = centralView.getUint32(cursor + 42, true);
    const entryEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (entryEnd > centralView.byteLength) throw new Error('A ZIP filename or directory record is truncated.');

    const rawName = decoder.decode(new Uint8Array(centralBytes, cursor + 46, nameLength));
    cursor = entryEnd;
    if (!rawName || rawName.endsWith('/')) continue;
    const name = normalizedName(rawName);
    if (flags & 1) throw new Error('Encrypted ZIP files are not supported.');
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error('ZIP64 entries are not supported.');
    }
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error('An archive entry is too large to import: ' + name);
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_BYTES) throw new Error('The archive expands beyond the allowed import size.');
    if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression method for ' + name + '.');

    const localHeaderBytes = await blob.slice(localHeaderOffset, localHeaderOffset + 30).arrayBuffer();
    if (localHeaderBytes.byteLength < 30 || new DataView(localHeaderBytes).getUint32(0, true) !== ZIP_LOCAL) {
      throw new Error('A ZIP file header is damaged: ' + name);
    }
    const localView = new DataView(localHeaderBytes);
    const localNameLength = localView.getUint16(26, true);
    const localExtraLength = localView.getUint16(28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > blob.size) throw new Error('A ZIP entry is truncated: ' + name);
    const compressedBlob = blob.slice(dataOffset, dataOffset + compressedSize);
    let fileBlob;

    if (method === 0) {
      fileBlob = compressedBlob;
    } else {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('This browser cannot extract compressed ZIP entries. Re-export the archive from QuranMemorizer or use a browser with DEFLATE ZIP support.');
      }
      try {
        const decompressor = new DecompressionStream('deflate-raw');
        fileBlob = await new Response(compressedBlob.stream().pipeThrough(decompressor)).blob();
      } catch (_) {
        throw new Error('This browser cannot extract this ZIP compression format. Re-export the archive from QuranMemorizer or use another browser.');
      }
    }

    if (fileBlob.size !== uncompressedSize) throw new Error('The extracted size did not match the ZIP directory: ' + name);
    if (await crc32Blob(fileBlob) !== expectedCrc) throw new Error('The ZIP entry failed its integrity check: ' + name);
    output.push({ name, blob: fileBlob, size: fileBlob.size });
  }

  return output;
}

import zlib from 'zlib';

export const PAGE_ALIGN = 16 * 1024;

const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const EOCD64_SIG = 0x06064b50;
const CDH_SIG = 0x02014b50;

export interface ZipEntry {
  name: string;
  headerOffset: number;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
}

function findEndOfCentralDirectory(buf: Buffer): number {
  const minEOCDLen = 22;
  const maxCommentLen = 65535;
  const searchFloor = Math.max(0, buf.length - minEOCDLen - maxCommentLen);
  for (let i = buf.length - minEOCDLen; i >= searchFloor; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new Error('Not a valid ZIP/APK file: End Of Central Directory record not found');
}

export function parseZipEntries(buf: Buffer): ZipEntry[] {
  const eocdPos = findEndOfCentralDirectory(buf);
  let cdOffset = buf.readUInt32LE(eocdPos + 16);
  let cdSize = buf.readUInt32LE(eocdPos + 12);
  let totalEntries = buf.readUInt16LE(eocdPos + 10);

  const locatorPos = eocdPos - 20;
  if (
    (cdOffset === 0xffffffff || totalEntries === 0xffff) &&
    locatorPos >= 0 &&
    buf.readUInt32LE(locatorPos) === EOCD64_LOCATOR_SIG
  ) {
    const eocd64Pos = Number(buf.readBigUInt64LE(locatorPos + 8));
    if (buf.readUInt32LE(eocd64Pos) === EOCD64_SIG) {
      totalEntries = Number(buf.readBigUInt64LE(eocd64Pos + 32));
      cdSize = Number(buf.readBigUInt64LE(eocd64Pos + 40));
      cdOffset = Number(buf.readBigUInt64LE(eocd64Pos + 48));
    }
  }

  // Corrects for any bytes prepended to the archive (e.g. signing padding)
  // by anchoring on where the central directory actually sits, mirroring
  // Python's zipfile module.
  const actualCdStart = eocdPos - cdSize;
  const concat = actualCdStart - cdOffset;

  const entries: ZipEntry[] = [];
  let pos = actualCdStart;
  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== CDH_SIG) break;

    const compressionMethod = buf.readUInt16LE(pos + 10);
    let compressedSize = buf.readUInt32LE(pos + 20);
    let uncompressedSize = buf.readUInt32LE(pos + 24);
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    let headerOffset = buf.readUInt32LE(pos + 42);
    const name = buf.toString('utf8', pos + 46, pos + 46 + nameLen);

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || headerOffset === 0xffffffff) {
      const extraStart = pos + 46 + nameLen;
      const extraEnd = extraStart + extraLen;
      let ep = extraStart;
      while (ep + 4 <= extraEnd) {
        const tag = buf.readUInt16LE(ep);
        const size = buf.readUInt16LE(ep + 2);
        if (tag === 0x0001) {
          let vp = ep + 4;
          if (uncompressedSize === 0xffffffff) { uncompressedSize = Number(buf.readBigUInt64LE(vp)); vp += 8; }
          if (compressedSize === 0xffffffff) { compressedSize = Number(buf.readBigUInt64LE(vp)); vp += 8; }
          if (headerOffset === 0xffffffff) { headerOffset = Number(buf.readBigUInt64LE(vp)); vp += 8; }
        }
        ep += 4 + size;
      }
    }

    entries.push({ name, headerOffset: headerOffset + concat, compressedSize, uncompressedSize, compressionMethod });
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

/** Offset (within the file) where a local entry's payload begins. */
export function getLocalDataOffset(buf: Buffer, headerOffset: number): number {
  const fnameLen = buf.readUInt16LE(headerOffset + 26);
  const extraLen = buf.readUInt16LE(headerOffset + 28);
  return headerOffset + 30 + fnameLen + extraLen;
}

export function extractEntryData(buf: Buffer, entry: ZipEntry): Buffer {
  const dataOffset = getLocalDataOffset(buf, entry.headerOffset);
  const raw = buf.subarray(dataOffset, dataOffset + entry.compressedSize);
  if (entry.compressionMethod === 0) return Buffer.from(raw);
  if (entry.compressionMethod === 8) return zlib.inflateRawSync(raw);
  throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}`);
}

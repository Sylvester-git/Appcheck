const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);
const PT_LOAD = 1;

export function isElf(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).equals(ELF_MAGIC);
}

/** p_align of the first PT_LOAD segment, or null if not an ELF / no PT_LOAD found. */
export function getLoadAlignment(buf: Buffer): number | null {
  if (!isElf(buf) || buf.length < 20) return null;

  const is64 = buf[4] === 2;
  let ePhoff: number;
  let ePhentsize: number;
  let ePhnum: number;

  if (is64) {
    if (buf.length < 64) return null;
    ePhoff = Number(buf.readBigUInt64LE(32));
    ePhentsize = buf.readUInt16LE(54);
    ePhnum = buf.readUInt16LE(56);
  } else {
    if (buf.length < 52) return null;
    ePhoff = buf.readUInt32LE(28);
    ePhentsize = buf.readUInt16LE(42);
    ePhnum = buf.readUInt16LE(44);
  }

  for (let i = 0; i < ePhnum; i++) {
    const phOffset = ePhoff + i * ePhentsize;
    if (phOffset + ePhentsize > buf.length) break;
    const pType = buf.readUInt32LE(phOffset);
    if (pType === PT_LOAD) {
      return is64 ? Number(buf.readBigUInt64LE(phOffset + 48)) : buf.readUInt32LE(phOffset + 28);
    }
  }

  return null;
}

export function isAligned(pAlign: number | null): boolean {
  if (pAlign === null) return false;
  const exp = Math.log2(pAlign);
  return Number.isInteger(exp) && exp >= 14;
}

export function formatAlignment(pAlign: number | null): string {
  if (pAlign === null) return '';
  if (pAlign <= 1) return '2**0';
  return `2**${Math.floor(Math.log2(pAlign))}`;
}

export function alignmentToKB(pAlign: number | null): string {
  if (pAlign === null) return '';
  const bytes = pAlign <= 1 ? 1 : pAlign;
  return bytes >= 1024 ? `${bytes / 1024} KB` : `${bytes} B`;
}

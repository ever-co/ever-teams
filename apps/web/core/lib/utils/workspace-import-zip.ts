import { Inflate } from 'pako';

/** What one archive may unpack to: an export of a few years of a team fits, a crafted archive does not fill memory. */
export const WORKSPACE_ZIP_MAX_BYTES = 20 * 1024 * 1024;

const END_OF_DIRECTORY_SIGNATURE = 0x06054b50;
const DIRECTORY_ENTRY_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const END_OF_DIRECTORY_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const ZIP64_MARKER = 0xffffffff;
const ENCRYPTED_FLAG = 0x1;
const STORED = 0;
const DEFLATED = 8;
const INFLATE_CHUNK_BYTES = 64 * 1024;

interface ZipEntry {
	/** The path inside the archive, with forward slashes. */
	name: string;
	bytes: Uint8Array;
}

export type ZipProblem = 'notZip' | 'encrypted' | 'unsupported' | 'tooLarge';

type ZipReading = { entries: ZipEntry[]; problem: null } | { entries: null; problem: ZipProblem };

class ZipRefusal extends Error {
	constructor(readonly problem: ZipProblem) {
		super(problem);
	}
}

function endOfDirectoryAt(view: DataView): number {
	const lastStart = view.byteLength - END_OF_DIRECTORY_SIZE;
	const firstStart = Math.max(0, lastStart - MAX_COMMENT_SIZE);
	for (let offset = lastStart; offset >= firstStart; offset -= 1) {
		if (view.getUint32(offset, true) === END_OF_DIRECTORY_SIGNATURE) {
			return offset;
		}
	}
	throw new ZipRefusal('notZip');
}

function nameOf(bytes: Uint8Array): string {
	return new TextDecoder('utf-8').decode(bytes).replaceAll('\\', '/');
}

/** Folders, and the system files some archivers add next to the real ones. */
function isSkipped(name: string): boolean {
	const isFolder = name.endsWith('/');
	const parts = name.split('/');
	const fileName = parts[parts.length - 1] ?? '';
	const isHidden = fileName.startsWith('.');
	const isSystemFolder = parts.some((part) => part.startsWith('__'));
	return isFolder || isHidden || isSystemFolder;
}

/**
 * Unpacks a deflated entry chunk by chunk and stops as soon as it passes `budget`: the size an archive claims is not
 * trusted, a crafted entry can claim a few bytes and unpack to gigabytes.
 */
function inflateWithin(packed: Uint8Array, budget: number): Uint8Array {
	const inflator = new Inflate({ raw: true, chunkSize: INFLATE_CHUNK_BYTES });
	const chunks: Uint8Array[] = [];
	let total = 0;
	inflator.onData = (chunk) => {
		const bytes = chunk as Uint8Array;
		total += bytes.byteLength;
		if (total > budget) {
			throw new ZipRefusal('tooLarge');
		}
		chunks.push(bytes);
	};
	inflator.push(packed, true);
	if (inflator.err) {
		throw new ZipRefusal('notZip');
	}
	const content = new Uint8Array(total);
	let position = 0;
	for (const chunk of chunks) {
		content.set(chunk, position);
		position += chunk.byteLength;
	}
	return content;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit += 1) {
		value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
	}
	return value >>> 0;
});

/** The CRC-32 an archive records for each file. */
function crc32Of(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function contentOf(bytes: Uint8Array, method: number, size: number, budget: number): Uint8Array {
	if (method === STORED) {
		// The same bytes can be listed several times under small claimed sizes: each one must hold what it claims
		if (bytes.byteLength !== size) {
			throw new ZipRefusal('notZip');
		}
		return bytes;
	}
	if (method === DEFLATED) {
		const content = inflateWithin(bytes, budget);
		if (content.byteLength !== size) {
			throw new ZipRefusal('notZip');
		}
		return content;
	}
	throw new ZipRefusal('unsupported');
}

/**
 * The files of a ZIP archive (stored or deflated, the two methods every archiver writes), read from its central
 * directory. Encrypted entries, ZIP64 archives and other compression methods are refused rather than half read.
 */
export function zipEntriesOf(buffer: ArrayBuffer): ZipReading {
	try {
		return { entries: readEntries(buffer), problem: null };
	} catch (error) {
		if (error instanceof ZipRefusal) {
			return { entries: null, problem: error.problem };
		}
		return { entries: null, problem: 'notZip' };
	}
}

function readEntries(buffer: ArrayBuffer): ZipEntry[] {
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);
	if (view.byteLength < END_OF_DIRECTORY_SIZE) {
		throw new ZipRefusal('notZip');
	}
	const end = endOfDirectoryAt(view);
	const count = view.getUint16(end + 10, true);
	let offset = view.getUint32(end + 16, true);
	const entries: ZipEntry[] = [];
	let unpackedBytes = 0;
	for (let index = 0; index < count; index += 1) {
		if (view.getUint32(offset, true) !== DIRECTORY_ENTRY_SIGNATURE) {
			throw new ZipRefusal('notZip');
		}
		const flags = view.getUint16(offset + 8, true);
		const method = view.getUint16(offset + 10, true);
		const packedSize = view.getUint32(offset + 20, true);
		const size = view.getUint32(offset + 24, true);
		const crc = view.getUint32(offset + 16, true);
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const localOffset = view.getUint32(offset + 42, true);
		const name = nameOf(bytes.subarray(offset + 46, offset + 46 + nameLength));
		offset += 46 + nameLength + extraLength + commentLength;
		if (isSkipped(name)) {
			continue;
		}
		const isZip64 = packedSize === ZIP64_MARKER || size === ZIP64_MARKER || localOffset === ZIP64_MARKER;
		if (isZip64) {
			throw new ZipRefusal('unsupported');
		}
		if ((flags & ENCRYPTED_FLAG) !== 0) {
			throw new ZipRefusal('encrypted');
		}
		unpackedBytes += size;
		if (unpackedBytes > WORKSPACE_ZIP_MAX_BYTES) {
			throw new ZipRefusal('tooLarge');
		}
		if (view.getUint32(localOffset, true) !== LOCAL_HEADER_SIGNATURE) {
			throw new ZipRefusal('notZip');
		}
		const localNameLength = view.getUint16(localOffset + 26, true);
		const localExtraLength = view.getUint16(localOffset + 28, true);
		const dataStart = localOffset + 30 + localNameLength + localExtraLength;
		const packed = bytes.subarray(dataStart, dataStart + packedSize);
		const budget = WORKSPACE_ZIP_MAX_BYTES - (unpackedBytes - size);
		const content = contentOf(packed, method, size, budget);
		if (crc32Of(content) !== crc) {
			throw new ZipRefusal('notZip');
		}
		entries.push({ name, bytes: content });
	}
	return entries;
}

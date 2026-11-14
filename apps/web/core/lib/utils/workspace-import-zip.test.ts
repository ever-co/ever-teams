import { deflateRaw } from 'pako';
import { zipEntriesOf } from './workspace-import-zip';

interface FileSpec {
	name: string;
	text: string;
	deflate?: boolean;
	flags?: number;
	method?: number;
	/** The unpacked size the archive claims, when it lies about it. */
	declaredSize?: number;
	/** The checksum the archive claims, when it does not match the content. */
	crc?: number;
}

function crc32Of(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/** A minimal archive writer for the tests: local headers, central directory, end record. */
function zipOf(files: ReadonlyArray<FileSpec>): ArrayBuffer {
	const encoder = new TextEncoder();
	const chunks: Uint8Array[] = [];
	const directory: Uint8Array[] = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.name);
		const content = encoder.encode(file.text);
		const isDeflated = file.deflate === true;
		let packed: Uint8Array = content;
		let defaultMethod = 0;
		if (isDeflated) {
			packed = deflateRaw(content);
			defaultMethod = 8;
		}
		const method = file.method ?? defaultMethod;
		const flags = file.flags ?? 0;
		const declaredSize = file.declaredSize ?? content.byteLength;
		const crc = file.crc ?? crc32Of(content);
		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true);
		local.setUint16(6, flags, true);
		local.setUint16(8, method, true);
		local.setUint32(14, crc, true);
		local.setUint32(18, packed.byteLength, true);
		local.setUint32(22, declaredSize, true);
		local.setUint16(26, name.byteLength, true);
		const central = new DataView(new ArrayBuffer(46));
		central.setUint32(0, 0x02014b50, true);
		central.setUint16(8, flags, true);
		central.setUint16(10, method, true);
		central.setUint32(16, crc, true);
		central.setUint32(20, packed.byteLength, true);
		central.setUint32(24, declaredSize, true);
		central.setUint16(28, name.byteLength, true);
		central.setUint32(42, offset, true);
		chunks.push(new Uint8Array(local.buffer), name, packed);
		directory.push(new Uint8Array(central.buffer), name);
		offset += 30 + name.byteLength + packed.byteLength;
	}
	const directorySize = directory.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, files.length, true);
	end.setUint16(10, files.length, true);
	end.setUint32(12, directorySize, true);
	end.setUint32(16, offset, true);
	const all = [...chunks, ...directory, new Uint8Array(end.buffer)];
	const total = all.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const out = new Uint8Array(total);
	let position = 0;
	for (const chunk of all) {
		out.set(chunk, position);
		position += chunk.byteLength;
	}
	return out.buffer;
}

function textsOf(buffer: ArrayBuffer) {
	const reading = zipEntriesOf(buffer);
	return reading.entries?.map((entry) => [entry.name, new TextDecoder().decode(entry.bytes)]) ?? reading.problem;
}

describe('zipEntriesOf', () => {
	it('reads stored and deflated files', () => {
		const archive = zipOf([
			{ name: 'clients.csv', text: 'name\nAcme\n' },
			{ name: 'export/time entries.csv', text: 'date,start time\n2026-10-01,09:00\n'.repeat(40), deflate: true }
		]);

		expect(textsOf(archive)).toEqual([
			['clients.csv', 'name\nAcme\n'],
			['export/time entries.csv', 'date,start time\n2026-10-01,09:00\n'.repeat(40)]
		]);
	});

	it('leaves out folders and the system files archivers add', () => {
		const archive = zipOf([
			{ name: 'export/', text: '' },
			{ name: '__MACOSX/export/._clients.csv', text: 'x' },
			{ name: 'export/.DS_Store', text: 'x' },
			{ name: 'export/clients.csv', text: 'name\n' }
		]);

		expect(textsOf(archive)).toEqual([['export/clients.csv', 'name\n']]);
	});

	it('refuses an encrypted entry, another compression method, and a file that is not an archive', () => {
		expect(textsOf(zipOf([{ name: 'a.csv', text: 'x', flags: 1 }]))).toBe('encrypted');
		expect(textsOf(zipOf([{ name: 'a.csv', text: 'x', method: 12 }]))).toBe('unsupported');
		expect(textsOf(new TextEncoder().encode('date,start\n2026-10-01,09:00\n').buffer)).toBe('notZip');
	});

	it('stops unpacking an entry that unpacks past what the archive may hold, whatever size it claims', () => {
		const flood = 'a'.repeat(21 * 1024 * 1024);

		expect(textsOf(zipOf([{ name: 'time.csv', text: flood, deflate: true, declaredSize: 10 }]))).toBe('tooLarge');
	});

	it('refuses a stored entry that holds more than it declares', () => {
		const text = 'date,start\n2026-10-01,09:00\n';

		expect(textsOf(zipOf([{ name: 'time.csv', text, declaredSize: 0 }]))).toBe('notZip');
	});

	it('refuses an entry whose content does not match its checksum', () => {
		const text = 'duration\n9\n';

		expect(textsOf(zipOf([{ name: 'time.csv', text, crc: 1 }]))).toBe('notZip');
		expect(textsOf(zipOf([{ name: 'time.csv', text, deflate: true, crc: 1 }]))).toBe('notZip');
	});
});

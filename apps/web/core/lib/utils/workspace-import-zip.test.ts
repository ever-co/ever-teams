import { deflateRaw } from 'pako';
import { zipEntriesOf } from './workspace-import-zip';

interface FileSpec {
	name: string;
	text: string;
	deflate?: boolean;
	flags?: number;
	method?: number;
}

/** A minimal archive writer for the tests: local headers, central directory, end record (CRC left at 0). */
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
		const local = new DataView(new ArrayBuffer(30));
		local.setUint32(0, 0x04034b50, true);
		local.setUint16(6, flags, true);
		local.setUint16(8, method, true);
		local.setUint32(18, packed.byteLength, true);
		local.setUint32(22, content.byteLength, true);
		local.setUint16(26, name.byteLength, true);
		const central = new DataView(new ArrayBuffer(46));
		central.setUint32(0, 0x02014b50, true);
		central.setUint16(8, flags, true);
		central.setUint16(10, method, true);
		central.setUint32(20, packed.byteLength, true);
		central.setUint32(24, content.byteLength, true);
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
});

import { pdfTextOf } from './dashboard-export';

describe('pdfTextOf', () => {
	it('writes as plain spaces the spaces the PDF font has no glyph for', () => {
		const thin = ' ';
		const narrow = ' ';
		const nonBreaking = ' ';

		expect(pdfTextOf(`Nov 1${thin}–${thin}30`)).toBe('Nov 1 – 30');
		expect(pdfTextOf(`10:12${narrow}AM`)).toBe('10:12 AM');
		expect(pdfTextOf(`1${narrow}250,00${nonBreaking}€`)).toBe('1 250,00 €');
	});

	it('leaves every other character as it is', () => {
		expect(pdfTextOf('Mise à jour – 2h 05m')).toBe('Mise à jour – 2h 05m');
	});
});

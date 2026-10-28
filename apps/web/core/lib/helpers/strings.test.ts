/**
 * splitFullName — the sign-up name split (POST /api/auth/register and registerService.registerGauzy).
 *
 * Regression: both paths used `name.split(' ')` and kept only the first two pieces, so
 * "Mary Jane Watson" was registered as "Mary" / "Jane" and extra spaces produced empty names.
 */
import { splitFullName } from './strings';

describe('splitFullName', () => {
	it('keeps every word after the first in the last name', () => {
		expect(splitFullName('Mary Jane Watson')).toEqual({ firstName: 'Mary', lastName: 'Jane Watson' });
	});

	it('splits a two-word name as before', () => {
		expect(splitFullName('John Doe')).toEqual({ firstName: 'John', lastName: 'Doe' });
	});

	it('gives an empty last name for a single word', () => {
		expect(splitFullName('Cher')).toEqual({ firstName: 'Cher', lastName: '' });
	});

	it('ignores leading, trailing and repeated whitespace', () => {
		expect(splitFullName('  John \t  Doe  ')).toEqual({ firstName: 'John', lastName: 'Doe' });
		expect(splitFullName(' Mary  Jane   Watson ')).toEqual({ firstName: 'Mary', lastName: 'Jane Watson' });
	});

	it('returns empty names for a blank input', () => {
		expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
		expect(splitFullName('   ')).toEqual({ firstName: '', lastName: '' });
	});
});

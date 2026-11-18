// Replaces the personal values of recorded answers with placeholders of the same type and form, so the fixtures hold
// no real data. The same value gets the same placeholder in every answer, so a relation (a log's employeeId and its
// employee's id) still points to the same record.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JWT = /^eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_TEXT = /^https?:\/\//i;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Fields whose text is a value the API picks from a list (a log type, a status, a currency), never a person's data:
// kept, so the fixtures show what the API answers and the types can name those values.
export const KEPT_KEYS = new Set([
	'billing',
	'billRateCurrency',
	'currency',
	'currencyPosition',
	'defaultBillRateCurrency',
	'defaultValueDateType',
	'issueType',
	'kind',
	'logType',
	'preferredComponentLayout',
	'preferredLanguage',
	'priority',
	'size',
	'source',
	'status',
	'taskListType'
]);

// Amounts of money a person earns or is billed at; other numbers (durations, counts) are kept.
const MONEY_KEY = /rate|income|bonus|expense|salary|pay/i;

// The first instant and day placeholders count from.
const PLACEHOLDER_EPOCH = Date.UTC(2000, 0, 1);
const MINUTE = 60 * 1000;
const DAY_LENGTH = 24 * 60 * MINUTE;
const DAY_TEXT_LENGTH = 'YYYY-MM-DD'.length;

function isRecord(value) {
	const isObject = typeof value === 'object' && value !== null;
	return isObject && !Array.isArray(value);
}

// `createdByUserId` names a user, `organizationTeam` a team: the last word of a key names the kind of record.
function lastWordOf(key) {
	const words = key.split(/(?=[A-Z])/);
	return words[words.length - 1].toLowerCase();
}

function kindOfId(key, parentKey, rootKind) {
	if (key !== 'id') {
		return lastWordOf(key.replace(/Ids?$/, ''));
	}
	const isRootRecord = parentKey === undefined || parentKey === 'items';
	if (isRootRecord) {
		return rootKind;
	}
	return lastWordOf(parentKey);
}

// Each distinct value gets the next number of its kind: the first employee is <employee-1>, the next <employee-2>.
function createNumbering() {
	const numbers = new Map();
	const counts = new Map();
	return (kind, value) => {
		const known = numbers.get(`${kind}\u0000${value}`);
		if (known !== undefined) {
			return known;
		}
		const next = (counts.get(kind) ?? 0) + 1;
		counts.set(kind, next);
		numbers.set(`${kind}\u0000${value}`, next);
		return next;
	};
}

function collectDates(value, dateTimes, days) {
	if (Array.isArray(value)) {
		value.forEach((item) => collectDates(item, dateTimes, days));
		return;
	}
	if (isRecord(value)) {
		Object.values(value).forEach((item) => collectDates(item, dateTimes, days));
		return;
	}
	if (typeof value !== 'string') {
		return;
	}
	if (DATE_TIME.test(value)) {
		dateTimes.add(value);
	}
	if (DAY.test(value)) {
		days.add(value);
	}
}

// Dates keep their order and their form, from 2000-01-01 on: a minute apart, or a day apart for days.
function datePlaceholders(answers) {
	const dateTimes = new Set();
	const days = new Set();
	answers.forEach((answer) => collectDates(answer, dateTimes, days));
	const byTime = (a, b) => Date.parse(a) - Date.parse(b);
	const placeholders = new Map();
	[...dateTimes].sort(byTime).forEach((value, rank) => {
		placeholders.set(value, new Date(PLACEHOLDER_EPOCH + rank * MINUTE).toISOString());
	});
	[...days].sort(byTime).forEach((value, rank) => {
		const day = new Date(PLACEHOLDER_EPOCH + rank * DAY_LENGTH).toISOString();
		placeholders.set(value, day.slice(0, DAY_TEXT_LENGTH));
	});
	return placeholders;
}

/**
 * The recordings with placeholders in place of personal values, and the real values replaced (`forbidden`), so a test
 * can check that none of them reached a fixture. Each recording is `{ name, route, status, answer, idKind }`, where
 * `idKind` names the records the answer lists (`project`) and `route` may hold ids (`GET /tasks/employee/<uuid>`).
 */
export function redactRecordings(recordings) {
	const dates = datePlaceholders(recordings.map((recording) => recording.answer));
	const numberOf = createNumbering();
	const forbidden = new Set();

	function replaced(original, placeholder) {
		forbidden.add(original);
		return placeholder;
	}

	function idPlaceholder(value, kind) {
		return replaced(value, `<${kind}-${numberOf(kind, value.toLowerCase())}>`);
	}

	function textOf(value, key, parentKey, rootKind) {
		if (UUID.test(value)) {
			return idPlaceholder(value, kindOfId(key ?? 'id', parentKey, rootKind));
		}
		if (JWT.test(value)) {
			return '<jwt>';
		}
		if (value === '') {
			return value;
		}
		if (EMAIL.test(value)) {
			return replaced(value, `person-${numberOf('email', value.toLowerCase())}@example.com`);
		}
		if (dates.has(value)) {
			return dates.get(value);
		}
		if (URL_TEXT.test(value)) {
			return replaced(value, `https://example.com/${key}-${numberOf(`url ${key}`, value)}`);
		}
		if (KEPT_KEYS.has(key)) {
			return value;
		}
		return replaced(value, `<${key}-${numberOf(`text ${key}`, value)}>`);
	}

	function redact(value, key, parentKey, rootKind) {
		if (Array.isArray(value)) {
			return value.map((item) => redact(item, key, parentKey, rootKind));
		}
		if (isRecord(value)) {
			const copy = {};
			for (const [childKey, child] of Object.entries(value)) {
				copy[childKey] = redact(child, childKey, key, rootKind);
			}
			return copy;
		}
		const isNumber = typeof value === 'number';
		const isMoneyKey = MONEY_KEY.test(key ?? '');
		if (isNumber && isMoneyKey) {
			return 0;
		}
		if (typeof value === 'string') {
			return textOf(value, key, parentKey, rootKind);
		}
		return value;
	}

	// An id in a path takes the kind of the segment before it: /tasks/employee/<employee-1>.
	function redactRoute(route) {
		const segments = route.split('/');
		return segments
			.map((segment, index) => {
				if (!UUID.test(segment)) {
					return segment;
				}
				return idPlaceholder(segment, segments[index - 1]);
			})
			.join('/');
	}

	const fixtures = recordings.map((recording) => ({
		name: recording.name,
		route: redactRoute(recording.route),
		status: recording.status,
		answer: redact(recording.answer, undefined, undefined, recording.idKind)
	}));
	return { fixtures, forbidden: [...forbidden] };
}

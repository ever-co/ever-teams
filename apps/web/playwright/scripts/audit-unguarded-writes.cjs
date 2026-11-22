/*
 * Re-derives the audit's §E.1 numbers: how many write handlers this app's own API routes export, how many of them
 * reach an origin/session guard in their own body or through an alias re-export, and which ones reach none.
 *
 * Read-only: it reads files and prints counts. It writes nothing and starts nothing. §M of
 * apps/web/playwright/audit-evidence.md is the command that runs it, and it lives here rather than in somebody's
 * temp folder so that a reader of that document can actually run it (PR #5675, CodeRabbit finding on
 * audit-evidence.md:645).
 *
 * Its vocabulary is the audit's, not the app's: GUARDS are the helpers the audit counts as a gate, EXTRA_GUARDS the
 * origin gates the audit's first vocabulary did not know. A route whose exported verb delegates to another route.ts
 * is followed once — that alias resolution is what the corrected count rests on. Numbers depend on the checkout it
 * is run against, so the commit the document quotes is part of the number.
 */
const { readdirSync, readFileSync, statSync } = require('fs');
const { resolve, relative, dirname } = require('path');

/** The repository this script sits in, not somebody's checkout path. */
const ROOT = resolve(__dirname, '..', '..', '..', '..');
const apiRoot = resolve(ROOT, 'apps/web/app/api');

const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE'];
const GUARDS = [
	'refuseWithoutPermission',
	'refuseUnlessPermitted',
	'refuseForeignWrite',
	'refuseForeignOrigin',
	'forwardToGauzy',
	'forwardDownloadToGauzy',
	'authenticatedGuard',
	'routeSession',
	'handleUnauthorized'
];
/** Origin gates the audit's first vocabulary did not know. */
const EXTRA_GUARDS = ['isTrustedBoardOrigin', 'isTrustedOrigin', 'sameOrigin'];

const files = [];
(function walk(d) {
	for (const e of readdirSync(d)) {
		const f = resolve(d, e);
		if (statSync(f).isDirectory()) walk(f);
		else if (f.endsWith('route.ts')) files.push(f);
	}
})(apiRoot);

const pathOf = (file) => {
	const folder = relative(apiRoot, dirname(file)).split('\\').join('/');
	return folder ? '/api/' + folder : '/api';
};
const TOP = /\n(?:export\s|(?:async\s+)?function\s|const\s+\w+\s*=)/;
const until = (s, at) => {
	const r = s.slice(at);
	const n = TOP.exec(r);
	return r.slice(0, n ? n.index : r.length);
};
const bodyOf = (src, verb) => {
	const d = new RegExp(`export\\s+(?:async\\s+)?function\\s+${verb}\\b`).exec(src);
	if (d) return until(src, d.index + d[0].length);
	const a = new RegExp(`export\\s+const\\s+${verb}\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*;`).exec(src);
	if (a) {
		const l = new RegExp(`(?:^|\\n)(?:async\\s+)?function\\s+${a[1]}\\b|(?:^|\\n)const\\s+${a[1]}\\s*=`).exec(src);
		return l ? until(src, l.index + l[0].length) : undefined;
	}
	const i = new RegExp(`export\\s+const\\s+${verb}\\s*=`).exec(src);
	return i ? until(src, i.index + i[0].length) : undefined;
};
const callsIn = (body, names) => names.filter((g) => new RegExp('\\b' + g + '\\s*\\(').test(body));
const isFile = (c) => {
	try {
		return statSync(c).isFile();
	} catch {
		return false;
	}
};

/** `import { POST as togglePOST } from '../toggle/route'` + a body that calls togglePOST → the real handler file. */
function delegatedTarget(src, verb, file) {
	const imp = new RegExp(
		`import\\s*\\{[^}]*\\b${verb}\\s+as\\s+([A-Za-z_$][\\w$]*)[^}]*\\}\\s*from\\s*'([^']+route)'`
	).exec(src);
	if (!imp) return null;
	const body = bodyOf(src, verb);
	if (!body || !new RegExp('\\b' + imp[1] + '\\s*\\(').test(body)) return null;
	const spec = imp[2];
	const fromDir = dirname(file);
	const bases = [];
	if (spec.startsWith('@/')) bases.push(resolve(ROOT, 'apps/web', spec.slice(2)));
	if (spec.startsWith('../') || spec.startsWith('./')) bases.push(resolve(fromDir, spec));
	bases.push(resolve(ROOT, 'apps/web', spec));
	for (const base of bases) {
		for (const c of [base + '.ts', base + '.tsx', base]) {
			if (isFile(c) && c.endsWith('route.ts')) return c;
		}
	}
	return null;
}

const rows = files.map((f) => {
	const src = readFileSync(f, 'utf8');
	const verbs = WRITE.filter((v) => {
		const pats = [
			new RegExp('export\\s+(async\\s+)?function\\s+' + v + '\\b'),
			new RegExp('export\\s+const\\s+' + v + '\\b'),
			new RegExp('export\\s+\\{[^}]*\\b' + v + '\\b')
		];
		return pats.some((p) => p.test(src));
	});
	const out = { path: pathOf(f), file: relative(ROOT, f).split('\\').join('/'), verbs, own: [], viaAlias: [] };
	for (const v of verbs) {
		const body = bodyOf(src, v);
		if (!body) continue;
		const own = callsIn(body, [...GUARDS, ...EXTRA_GUARDS]);
		if (own.length) {
			out.own.push({ verb: v, guards: own });
			continue;
		}
		const target = delegatedTarget(src, v, f);
		if (target) {
			const tsrc = readFileSync(target, 'utf8');
			const tbody = bodyOf(tsrc, v);
			const tg = tbody ? callsIn(tbody, [...GUARDS, ...EXTRA_GUARDS]) : [];
			out.viaAlias.push({ verb: v, target: relative(ROOT, target).split('\\').join('/'), guards: tg });
		}
	}
	return out;
});

const writeTotal = rows.reduce((a, r) => a + r.verbs.length, 0);
const ownGuarded = rows.reduce((a, r) => a + r.own.length, 0);
const extraOnly = rows.reduce(
	(a, r) => a + r.own.filter((o) => o.guards.some((g) => EXTRA_GUARDS.includes(g))).length,
	0
);
const aliasGuarded = rows.reduce((a, r) => a + r.viaAlias.filter((x) => x.guards.length).length, 0);
const aliasUnguarded = rows.reduce((a, r) => a + r.viaAlias.filter((x) => !x.guards.length).length, 0);
const unguarded = [];
for (const r of rows) {
	for (const v of r.verbs) {
		const covered = r.own.some((o) => o.verb === v) || r.viaAlias.some((x) => x.verb === v && x.guards.length);
		if (!covered) unguarded.push(`${v} ${r.path}`);
	}
}

console.log('route.ts files: ' + rows.length);
console.log('write verb entries: ' + writeTotal);
console.log('write entries whose own handler body calls a guard (extended vocabulary): ' + ownGuarded);
console.log('   of which only the extra names (isTrustedBoardOrigin & co): ' + extraOnly);
console.log('write entries guarded through an alias re-export: ' + aliasGuarded);
console.log('write entries that delegate to another route which itself has no guard: ' + aliasUnguarded);
console.log('write entries with no guard own or inherited: ' + unguarded.length);
console.log('   across ' + new Set(unguarded.map((u) => u.split(' ').slice(1).join(' '))).size + ' route files');
console.log('alias re-exports found:');
for (const r of rows)
	for (const a of r.viaAlias)
		console.log('   ' + a.verb + ' ' + r.path + ' -> ' + a.target + ' guards=' + JSON.stringify(a.guards));
console.log('corrected unguarded write list (' + unguarded.length + '):');
console.log(JSON.stringify(unguarded.sort(), null, 1));

// The address without its trailing slashes (a loop: the regex /\/+$/ backtracks on a long run of slashes).
export function withoutTrailingSlashes(url: string): string {
	let end = url.length;
	while (end > 0 && url[end - 1] === '/') {
		end -= 1;
	}
	return url.slice(0, end);
}

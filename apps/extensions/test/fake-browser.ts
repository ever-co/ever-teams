// Test-only stand-in of `~misc/browser`: the `chrome` a test installs on globalThis (see fake-chrome.ts).
const browser = new Proxy(
	{},
	{
		get: (_target, key) => (globalThis as unknown as { chrome: Record<PropertyKey, unknown> }).chrome[key]
	}
) as typeof chrome;

export default browser;

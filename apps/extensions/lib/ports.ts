/**
 * Whether a port opened to the background comes from one of the extension's own pages (the popup). A content script
 * runs in a web page and its port names the tab: the extension has none of its own, so such a port is a page's, and
 * what it says is not trusted.
 */
export function isOwnPagePort(port: { sender?: { tab?: unknown } }): boolean {
	return !port.sender?.tab;
}

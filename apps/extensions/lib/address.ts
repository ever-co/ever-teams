// A local server may be plain http; every other address must be https
const ALLOWED_ADDRESS = /^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)(\/\S*)?$/i;

/** Whether the browser can open the address: the pattern alone lets through a port out of range. */
function isOpenable(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/** Whether an API or web app address may be saved: an https address, or plain http on this computer. */
export function isAllowedAddress(value: string): boolean {
	const address = value.trim();
	return ALLOWED_ADDRESS.test(address) && isOpenable(address);
}

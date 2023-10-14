export function wait(sec = 1) {
	return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

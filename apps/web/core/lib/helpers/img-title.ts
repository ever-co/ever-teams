export const imgTitle = (name: string) => {
	const str = `${name || ''}`.replace(/[^a-zA-Z ]/g, '');
	return str.split(' ')[1]
		? str.split(' ')[0].charAt(0).toUpperCase() + str.split(' ')[1].charAt(0).toUpperCase()
		: str.substring(0, 2).toUpperCase();
};

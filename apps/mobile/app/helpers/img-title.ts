export const imgTitle = (name: string) => {
	return name?.split(" ")[1]
		? name.split(" ")[0].charAt(0).toUpperCase() + name.split(" ")[1].charAt(0).toUpperCase()
		: name?.substring(0, 2).toUpperCase()
}

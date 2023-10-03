import { GAUZY_API_URL } from "@env"
export function generateIconList(iconFor: string, icons: string[]) {
	return icons.map((icon) => {
		return {
			fullUrl: `${GAUZY_API_URL}/public/ever-icons/${iconFor}/${icon}.svg`,
			path: `ever-icons/${iconFor}/${icon}.svg`,
			title: icon,
		}
	})
}

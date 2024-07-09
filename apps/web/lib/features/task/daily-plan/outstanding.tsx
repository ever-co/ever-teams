interface IOutstanding {
	filtre?: any;
}
export function Outstanding({ filtre }: IOutstanding) {
	return (<>{filtre}</>);
}

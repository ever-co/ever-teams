interface IOutstanding {
	filter?: any;
}
export function Outstanding({ filter }: IOutstanding) {
	return (<>{filter}</>);
}

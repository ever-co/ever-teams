import { useEditor } from '@craftjs/core';

function useSelectedNextAtom() {
	// const {
	// 	connectors: { connect, drag },
	// 	id
	// } = useNode();
	const { selected } = useEditor((state, query) => {
		const currentNodeId = query.getEvent('selected').last();
		let selected;

		if (currentNodeId) {
			selected = {
				id: currentNodeId,
				name: state.nodes[currentNodeId].data.name,
				settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
				isDeletable: query.node(currentNodeId).isDeletable()
			};
		}

		return {
			selected,
			isEnabled: state.options.enabled
		};
	});
	// const isSelected = id == Array.from(rest.hoveredNodeId.selected)[0];
	const { node } = useEditor((state) => ({
		node: state.nodes,
		state: state
	}));
	const allNodes = Object.entries(node)
		// .filter((v) => v[1].data.props?.id !== 'no-drag')
		.map(([key, value]) => ({
			...value,
			uId: key
		}));
	const rootNodes = allNodes.find((v) => v.uId === 'ROOT');
	const rootDivIds = rootNodes?.data.nodes;
	const nextIndex =
		Array.isArray(rootDivIds) && rootDivIds.length > 0 ? rootDivIds?.findIndex((v) => v == selected?.id) + 1 : 0;
	// console.log('test-api', selected?.id, rootDivIds, rootDivIds[nextIndex]);

	return {
		data: rootDivIds,
		disabledId: rootDivIds?.length ? rootDivIds![nextIndex] : 0
		// disabledId: Array.isArray(rootDivIds) && rootDivIds.length > 0 && nextIndex == 0 ? rootDivIds[nextIndex] : 0
	};
}

export default useSelectedNextAtom;

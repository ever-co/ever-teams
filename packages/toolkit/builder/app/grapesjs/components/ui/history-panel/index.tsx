interface HistoryPanelProps {
    stack: any[];
    currentIndex: number;
    onItemClick: (index: number) => void;
}

// Add helper function to format action labels
const getActionLabel = (item: any): string => {
    if (!item) return 'Unknown Action';

    const type = item.type || '';
    switch (type) {
        case 'component:add':
            return `Added ${item.component?.type || 'component'}`;
        case 'component:remove':
            return `Removed ${item.component?.type || 'component'}`;
        case 'component:update':
            return `Updated ${item.component?.type || 'component'}`;
        case 'component:style':
            return `Changed style`;
        case 'component:selected':
            return 'Selection changed';
        case 'canvas:update':
            return 'Canvas updated';
        default:
            return `${type.split(':').join(' ')}`;
    }
};

export const createHistoryPanel = ({
    stack,
    currentIndex,
    onItemClick
}: HistoryPanelProps) => {
    const container = document.createElement('div');
    container.className = 'gjs-history-panel';

    stack.forEach((item, index) => {
        const entry = document.createElement('div');
        entry.className = `history-item ${index === currentIndex ? 'active' : ''}`;
        entry.textContent = getActionLabel(item);
        entry.onclick = () => onItemClick(index);
        container.appendChild(entry);
    });

    return container;
};

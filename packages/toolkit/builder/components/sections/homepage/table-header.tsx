export const TableHeader = () => (
    <thead>
        <tr className="bg-[#0C0C0C]">
            {['Features', 'Plasmic', 'Builder.io', 'GrapesJS', 'Craft.js'].map((header) => (
                <th key={header} className="p-4 text-left text-[#BEBEBE] font-semibold text-sm leading-4 border-b border-[#27272A]">
                    {header}
                </th>
            ))}
        </tr>
    </thead>
);
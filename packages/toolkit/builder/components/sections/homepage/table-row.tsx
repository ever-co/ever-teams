import { ComparisonRow } from '../../../types';

export const TableRow = ({ row }: { row: ComparisonRow }) => (
    <tr className="bg-[#000000] hover:bg-[#0C0C0C] transition-colors">
        <td className="p-4 text-white font-semibold text-sm leading-4 border-b border-[#27272A]">{row.feature}</td>
        <td className="p-4 text-[#BEBEBE] text-sm leading-4 border-b border-[#27272A] whitespace-pre-line">{row.plasmic}</td>
        <td className="p-4 text-[#BEBEBE] text-sm leading-4 border-b border-[#27272A] whitespace-pre-line">{row.builder}</td>
        <td className="p-4 text-[#BEBEBE] text-sm leading-4 border-b border-[#27272A]">{row.grapes}</td>
        <td className="p-4 text-[#BEBEBE] text-sm leading-4 border-b border-[#27272A]">{row.craft}</td>
    </tr>
);
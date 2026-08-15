import { ComparisonRow } from '../../../types';
import { TableRow } from './table-row';

export const TableBody = ({ data }: { data: ComparisonRow[] }) => (
  <tbody>
    {data.map((row, index) => (
      <TableRow key={index} row={row} />
    ))}
  </tbody>
);

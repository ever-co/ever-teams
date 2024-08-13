"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@components/ui/table"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@components/ui/select"
import {
    MdKeyboardDoubleArrowLeft,
    MdKeyboardDoubleArrowRight,
    MdKeyboardArrowLeft,
    MdKeyboardArrowRight
} from "react-icons/md";



const data: TimeSheet[] = [
    {
        id: 1,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '08:00h'
    },
    {
        id: 2,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Pending",
        time: '08:00h'
    },
    {
        id: 3,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Approved",
        time: '08:00h'
    },
    {
        id: 4,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Pending",
        time: '08:00h'
    },
    {
        id: 5,
        task: "chore(deps-dev): bump karma from 5.2.3 to 6.3.16chore",
        name: "Gauzy Platform SaaS",
        description: "Members count 11",
        employee: "Ruslan Konviser",
        status: "Rejected",
        time: '06:00h'
    },
]

export type TimeSheet = {
    id: number,
    task: string,
    name: string,
    description: string,
    employee: string,
    status: "Approved" | "Pending" | "Rejected",
    time: string
}

const statusOptions = [
    { value: "Approved", label: "Approved" },
    { value: "Pending", label: "Pending" },
    { value: "Rejected", label: "Rejected" },
];

function getStatusColor(status: string) {
    switch (status) {
        case 'Rejected':
            return "text-red-400";
        case 'Approved':
            return "text-gray-500";
        case 'Pending':
            return "text-orange-400";
        default:
            return "";
    }
}


export const columns: ColumnDef<TimeSheet>[] = [
    {
        accessorKey: "task",
        header: "Task",
        cell: ({ row }) => (
            <div className="capitalize break-words whitespace-break-spaces text-sm sm:text-base">{row.getValue("task")}</div>
        ),
    },
    {
        accessorKey: "name",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="text-sm sm:text-base w-full text-center"
            >
                Project
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex items-start w-full">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary dark:bg-primary-light text-white shadow p-2">
                    <span className="lowercase font-medium">ever</span>
                </div>
                <div className="flex flex-col items-start w-full sm:w-1/2 ml-4">
                    <span className="capitalize font-bold text-sm sm:text-base text-gray-800 dark:text-white leading-4 whitespace-nowrap">
                        {row.original.name}
                    </span>
                    <span className="capitalize font-normal text-sm sm:text-base text-gray-400 leading-4 whitespace-nowrap">
                        {row.original.description}
                    </span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "employee",
        header: () => (
            <div className="text-center w-full sm:w-96 text-sm sm:text-base">Employee</div>
        ),
        cell: ({ row }) => (
            <div className="text-center font-medium w-full sm:w-96 text-sm sm:text-base">
                {row.original.employee}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: () => (
            <div className="text-center w-full sm:w-auto text-sm sm:text-base">Status</div>
        ),
        cell: ({ row }) => (
            <SelectFilter status={row.original.status} />
        ),
    },
    {
        accessorKey: "time",
        header: () => (
            <div className="text-center w-full text-sm sm:text-base">Time</div>
        ),
        cell: ({ row }) => (
            <div className={`text-center font-medium w-full text-sm sm:text-base ${getStatusColor(row.original.status)}`}>
                {row.original.time}
            </div>
        ),
    },
    {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
            const payment = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 border text-sm sm:text-base">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(payment.id as any)}
                        >
                            Copy payment ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View customer</DropdownMenuItem>
                        <DropdownMenuItem>View payment details</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

export function DataTableTimeSheet() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    return (
        <div className="w-full">
            <div className="rounded-md  w-full ">
                <Table className=" border dark:border-gray-700">
                    <TableHeader className="w-full border dark:border-gray-700">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    className=" cursor-pointer border dark:border-gray-700"
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="space-x-2 flex items-center">
                    <Button
                        className="border dark:border-gray-700 text-xl flex items-center justify-center cursor-pointer"
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <MdKeyboardDoubleArrowLeft />
                    </Button>
                    <Button
                        className="border dark:border-gray-700 text-xl flex items-center justify-center cursor-pointer"
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <MdKeyboardArrowLeft />
                    </Button>
                    <Button
                        className="border dark:border-gray-700 text-xl flex items-center justify-center cursor-pointer"
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <MdKeyboardArrowRight />
                    </Button>
                    <Button
                        className="border dark:border-gray-700 text-xl flex items-center justify-center cursor-pointer"
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <MdKeyboardDoubleArrowRight />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function SelectFilter({ status }: { status?: string }) {
    const [selectedStatus, setSelectedStatus] = React.useState(status || "");

    const getColorClass = () => {
        switch (selectedStatus) {
            case "Rejected":
                return "text-red-500 border-red-500 rou";
            case "Approved":
                return "text-green-500 border-green-500";
            case "Pending":
                return "text-orange-500 border-orange-500";
            default:
                return "text-gray-500 border-gray-200";
        }
    };

    return (
        <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value)}
        >
            <SelectTrigger
                className={`min-w-[120px] w-fit border border-gray-200 dark:border-gray-700 bg-transparent font-medium rounded-xl ${getColorClass()}`}
            >
                <SelectValue
                    placeholder="Select a daily"
                    className={getColorClass()}
                />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup className="rounded">
                    <SelectLabel>Status</SelectLabel>
                    {statusOptions.map((option, index) => (
                        <div key={option.value}>
                            <SelectItem value={option.value}>{option.label}</SelectItem>
                            {index < statusOptions.length - 1 && (
                                <div className="border w-full border-gray-100 dark:border-gray-700"></div>
                            )}
                        </div>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>

    );
}

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
import { ArrowUpDownIcon, MoreHorizontal, } from "lucide-react"
import { Button } from "@components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
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
import { ConfirmStatusChange, StatusBadge, TimeSheet, dataSourceTimeSheet, statusOptions } from "."
import { useModal } from "@app/hooks"
import { Checkbox } from "@components/ui/checkbox";








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
        enableHiding: false,
        id: "select",
        size: 50,
        header: ({ table }) => (
            <div className="gap-x-4 flex items-center" >
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
                <span>Task</span>
            </div>
        ),
        cell: ({ row }) => (

            <div className="flex items-center  gap-x-4" >
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
                <span className="capitalize !text-sm break-words whitespace-break-spaces sm:text-base">{row.original.task}</span>
            </div>
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
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <TaskDetails
                description={row.original.description}
                name={row.original.name}
            />
        ),
    },
    {
        accessorKey: "employee",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="text-center flex items-center justify-center font-medium w-full sm:w-96 text-sm sm:text-base">
                <span>Employee</span>
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="text-center font-medium w-full sm:w-96 text-sm sm:text-base">
                <span>  {row.original.employee}</span>
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className=" flex items-center justify-center text-center w-full sm:w-auto text-sm sm:text-base"
            >
                <span>Status</span>
                <ArrowUpDownIcon className="ml-2 h-4 w-4" />
            </Button>

        ),
        cell: ({ row }) => {
            return <StatusBadge
                selectedStatus={row.original.status} />
        }
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

            return (
                <TaskActionMenu idTasks={row?.original?.id} />
            );
        },
    },
];



export function DataTableTimeSheet() {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const table = useReactTable({
        data: dataSourceTimeSheet,
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
        <>


            <div className="w-full">
                <div className="rounded-md">
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
                                        className="cursor-pointer border dark:border-gray-700 font-normal"
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell aria-checked key={cell.id}>
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
                                        className="h-24 text-center">
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
                    <div className="gap-x-3 flex items-center">
                        <span className="text-sm font-medium">Page 1 of 10</span>
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
        </>
    )
}




export function SelectFilter({ selectedStatus }: { selectedStatus?: string }) {

    const { isOpen, closeModal, openModal } = useModal();
    const [selected] = React.useState(selectedStatus);
    const [newStatus, setNewStatus] = React.useState('');

    const getColorClass = () => {
        switch (selected) {
            case "Rejected":
                return "text-red-500 border-gray-200";
            case "Approved":
                return "text-green-500 border-gray-200";
            case "Pending":
                return "text-orange-500 border-gray-200";
            default:
                return "text-gray-500 border-gray-200";
        }


    };


    const onValueChanges = (value: string) => {
        setNewStatus(value);
        openModal()
    }

    return (
        <>

            <ConfirmStatusChange
                closeModal={closeModal}
                isOpen={isOpen}
                oldStatus={selected}
                newStatus={newStatus}
            />

            <Select
                value={selected}
                onValueChange={(value) => onValueChanges(value)}
            >
                <SelectTrigger
                    className={`min-w-[120px] w-fit border border-gray-200 h-8 dark:border-gray-700 bg-transparent font-normal rounded-md ${getColorClass()}`}
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
        </>
    );
}

const TaskActionMenu = ({ idTasks }: { idTasks: any }) => {
    const handleCopyPaymentId = () => navigator.clipboard.writeText(idTasks);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0  text-sm sm:text-base">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={handleCopyPaymentId}>
                    Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <StatusTask />
                <DropdownMenuItem className="text-red-600 hover:!text-red-600 cursor-pointer">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const TaskDetails = ({ description, name }: { description: string; name: string }) => {
    return (
        <div className="flex items-center gap-x-2 w-full">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary dark:bg-primary-light text-white shadow p-2">
                <span className="lowercase font-medium">ever</span>
            </div>
            <span className="capitalize font-bold !text-sm sm:text-base text-gray-800 dark:text-white leading-4 whitespace-nowrap">
                {name}
            </span>
            <div style={{ display: 'none' }}>{description}</div>
        </div>
    );
};

export const StatusTask = () => {
    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    {statusOptions?.map((status, index) => (
                        <DropdownMenuItem key={index} textValue={status.value} className="cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-1 rounded-full bg-black dark:bg-white"></div>
                                <span>{status.label}</span>
                            </div>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
        </DropdownMenuSub>
    )
}

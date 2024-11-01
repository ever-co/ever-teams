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
import { ArrowUpDownIcon, MoreHorizontal } from "lucide-react"
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
    TableCell, TableRow
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
} from "react-icons/md"
import { ConfirmStatusChange, StatusBadge, TimeSheet, dataSourceTimeSheet, statusOptions } from "."
import { useModal } from "@app/hooks"
import { Checkbox } from "@components/ui/checkbox"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@components/ui/accordion"
import { clsxm } from "@/app/utils"

const statusColor = (status: string) => {
    return status === 'Pending'
        ? { bg: 'bg-[#FBB650]', text: 'text-[#FBB650]', bgOpacity: 'rgba(251, 182, 80, 0.1)' }
        : status === 'Approved'
            ? { bg: 'bg-[#30B366]', text: 'text-[#30B366]', bgOpacity: 'rgba(48, 179, 102, 0.1)' }
            : { bg: 'bg-[#dc2626]', text: 'text-[#dc2626]', bgOpacity: 'rgba(220, 38, 38, 0.1)' };
};


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

            <div className="flex items-center  gap-x-4 w-[640px]" >
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
                <span className="capitalize !text-sm break-words whitespace-break-spaces sm:text-base !truncate !overflow-hidden">{row.original.task}</span>
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
            <div className={`text-center font-sans w-full text-sm sm:text-base ${statusColor(row.original.status).text}`}>
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

    const groupedRows = {
        Pending: table.getRowModel().rows.filter(row => row.original.status === "Pending"),
        Approved: table.getRowModel().rows.filter(row => row.original.status === "Approved"),
        Rejected: table.getRowModel().rows.filter(row => row.original.status === "Rejected")
    };



    return (
        <div className="w-full">
            <div className="rounded-md">
                <Table className="border rounded-md">
                    {/* <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.````columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader> */}
                    <TableBody className="w-full rounded-md">
                        <Accordion type="single" collapsible>
                            {Object.entries(groupedRows).map(([status, rows]) => (
                                <AccordionItem key={status} value={status} className="p-1 rounded">
                                    <AccordionTrigger
                                        style={{ backgroundColor: statusColor(status).bgOpacity }}
                                        type="button"
                                        className={clsxm(
                                            "flex flex-row-reverse justify-end items-center w-full h-9 rounded-sm gap-x-2 hover:no-underline",
                                            statusColor(status).text,
                                        )}
                                    >
                                        <div className="flex items-center space-x-1">
                                            <div className={clsxm("p-2 rounded", statusColor(status).bg)}></div>
                                            <div className="flex items-center gap-x-1">
                                                <span className="text-base font-normal uppercase text-gray-400">
                                                    {status}
                                                </span>
                                                <span className="text-gray-400 text-[14px]">({rows.length})</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col w-full">
                                        {rows.length ? (
                                            rows.map((row) => (
                                                <TableRow style={{ backgroundColor: statusColor(status).bgOpacity }}
                                                    key={row.id} className="min-w-full w-auto">
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell key={cell.id} className="w-full">
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="text-center">No results.</TableCell>
                                            </TableRow>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of{" "}
                    {table.getFilteredRowModel().rows.length} row(s) selected.
                </div>
                <div className="gap-x-3 flex items-center">
                    <span className="text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>                    <Button
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}>
                        <MdKeyboardDoubleArrowLeft />
                    </Button>
                    <Button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}>
                        <MdKeyboardArrowLeft />
                    </Button>
                    <Button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}>
                        <MdKeyboardArrowRight />
                    </Button>
                    <Button
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}>
                        <MdKeyboardDoubleArrowRight />
                    </Button>
                </div>
            </div>
        </div>

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
        <div className="flex items-center gap-x-2 w-40 ">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary dark:bg-primary-light text-white shadow p-2">
                <span className="lowercase font-medium text-[10px]">ever</span>
            </div>
            <span className="capitalize font-medium !text-sm sm:text-base text-gray-800 dark:text-white leading-4 whitespace-nowrap">
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

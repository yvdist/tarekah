"use client";

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { OptionSelect } from "@/components/option-select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationStatus } from "@/db/schema/enum-values";
import { cn } from "@/lib/utils";
import { followUpLabel, type FollowUpState } from "../follow-up";
import { formatDate } from "../format";
import {
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
  STATUS_ORDER,
  WORK_TYPE_LABELS,
  WORK_TYPE_OPTIONS,
} from "../labels";
import type { ApplicationListItem } from "../queries";
import { DeleteApplicationDialog } from "./delete-application-dialog";
import { StatusBadge } from "./status-badge";

const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: {
    equalsString: filterFn_equalsString,
    includesString: filterFn_includesString,
  },
});

const helper = createColumnHelper<typeof features, ApplicationListItem>();

const columns = helper.columns([
  helper.accessor("companyName", {
    header: ({ column }) => <SortButton column={column} label="Perusahaan" />,
    sortFn: (a, b) =>
      a.original.companyName.localeCompare(b.original.companyName, "id"),
    // Narrow tables drop the position and follow-up columns, so the company
    // cell carries both.
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <Link
          href={`/applications/${row.original.id}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {row.original.companyName}
        </Link>
        <span className="text-[0.8125rem] text-muted-foreground @xl:hidden">
          {row.original.position}
        </span>
        <FollowUpMark
          followUp={row.original.followUp}
          className="@4xl:hidden"
        />
      </div>
    ),
  }),
  helper.accessor("position", {
    header: "Posisi",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block max-w-64 truncate" title={row.original.position}>
        {row.original.position}
      </span>
    ),
  }),
  helper.accessor("status", {
    header: ({ column }) => <SortButton column={column} label="Status" />,
    // Pipeline order, not alphabetical.
    sortFn: (a, b) =>
      STATUS_ORDER[a.original.status] - STATUS_ORDER[b.original.status],
    filterFn: "equalsString",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  helper.accessor("source", {
    header: "Sumber",
    enableSorting: false,
    filterFn: "equalsString",
    cell: ({ row }) => SOURCE_LABELS[row.original.source],
  }),
  helper.accessor("workType", {
    header: "Tipe kerja",
    enableSorting: false,
    filterFn: "equalsString",
    cell: ({ row }) =>
      row.original.workType ? WORK_TYPE_LABELS[row.original.workType] : "—",
  }),
  helper.accessor("appliedAt", {
    header: ({ column }) => (
      <SortButton column={column} label="Tanggal apply" />
    ),
    // ISO dates compare as strings; applications without a date sort first.
    sortFn: (a, b) =>
      (a.original.appliedAt ?? "").localeCompare(b.original.appliedAt ?? ""),
    cell: ({ row }) => (
      <span className="font-figure text-[0.8125rem]">
        {formatDate(row.original.appliedAt)}
      </span>
    ),
  }),
  helper.display({
    id: "followUp",
    header: "Follow-up",
    cell: ({ row }) =>
      followUpLabel(row.original.followUp) ? (
        <FollowUpMark followUp={row.original.followUp} short />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    cell: ({ row }) => <RowActions application={row.original} />,
  }),
]);

// Columns leave as the table's own width shrinks, least important first. The
// sidebar takes a share of the viewport, hence container queries.
const COLUMN_CLASS: Record<string, string> = {
  position: "hidden @xl:table-cell",
  appliedAt: "hidden @2xl:table-cell",
  source: "hidden @3xl:table-cell",
  followUp: "hidden @4xl:table-cell",
  workType: "hidden @5xl:table-cell",
  // The menu button is taller than a line of text; it must not set the row.
  actions: "py-0",
};

const CLOSED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  "rejected",
  "ghosted",
]);

const ALL = "all";
const withAll = <T extends string>(
  label: string,
  options: ReadonlyArray<{ value: T; label: string }>,
) => [{ value: ALL, label }, ...options];

const STATUS_FILTER_OPTIONS = withAll("Semua status", STATUS_OPTIONS);
const SOURCE_FILTER_OPTIONS = withAll("Semua sumber", SOURCE_OPTIONS);
const WORK_TYPE_FILTER_OPTIONS = withAll("Semua tipe kerja", WORK_TYPE_OPTIONS);

export function ApplicationsTable({ data }: { data: ApplicationListItem[] }) {
  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    // Search covers the company name and the position only.
    getColumnCanGlobalFilter: (column) =>
      column.id === "companyName" || column.id === "position",
  });

  if (data.length === 0) {
    return (
      <EmptyState
        title="Catat léngkah pertamamu"
        description="Setiap lamaran yang kamu catat muncul di sini, lengkap dengan status, riwayat, dan catatannya."
      >
        <Link
          href="/applications/new"
          className={buttonVariants({ variant: "outline" })}
        >
          Catat lamaran pertama
        </Link>
      </EmptyState>
    );
  }

  const search = String(table.state.globalFilter ?? "");
  const filterValue = (columnId: string) => {
    const value = table.state.columnFilters.find(
      (filter) => filter.id === columnId,
    )?.value;

    return typeof value === "string" ? value : ALL;
  };
  const setFilter = (columnId: string, value: string) =>
    table
      .getColumn(columnId)
      ?.setFilterValue(value === ALL ? undefined : value);
  const isFiltered = search !== "" || table.state.columnFilters.length > 0;
  const rows = table.getRowModel().rows;

  function resetFilters() {
    table.setGlobalFilter("");
    table.setColumnFilters([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 basis-full sm:basis-64">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Cari perusahaan atau posisi"
            placeholder="Cari perusahaan atau posisi…"
            value={search}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-10 pl-9"
          />
        </div>
        <OptionSelect
          aria-label="Filter status"
          value={filterValue("status")}
          onValueChange={(value) => setFilter("status", value)}
          options={STATUS_FILTER_OPTIONS}
          className="h-10! flex-1 sm:flex-none"
        />
        <OptionSelect
          aria-label="Filter sumber"
          value={filterValue("source")}
          onValueChange={(value) => setFilter("source", value)}
          options={SOURCE_FILTER_OPTIONS}
          className="h-10! flex-1 sm:flex-none"
        />
        <OptionSelect
          aria-label="Filter tipe kerja"
          value={filterValue("workType")}
          onValueChange={(value) => setFilter("workType", value)}
          options={WORK_TYPE_FILTER_OPTIONS}
          className="h-10! flex-1 sm:flex-none"
        />
        {isFiltered ? (
          <Button variant="ghost" size="lg" onClick={resetFilters}>
            Reset
          </Button>
        ) : null}
      </div>

      <div className="@container overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={ariaSort(header.column.getIsSorted())}
                    className={COLUMN_CLASS[header.column.id]}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  // A closed application steps back; its company stays legible.
                  className={cn(
                    CLOSED_STATUSES.has(row.original.status) &&
                      "text-muted-foreground",
                  )}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        COLUMN_CLASS[cell.column.id],
                        cell.column.id === "companyName" &&
                          "whitespace-normal @xl:whitespace-nowrap",
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="font-medium">Tidak ada lamaran yang cocok</p>
                    <p className="text-sm text-muted-foreground">
                      Ubah kata kunci atau filter untuk melihat lamaran lain.
                    </p>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Reset filter
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <p
          className="border-t px-4 py-3 text-xs text-muted-foreground"
          aria-live="polite"
        >
          Menampilkan {rows.length} dari {data.length} lamaran
        </p>
      </div>
    </div>
  );
}

function ariaSort(sorted: false | "asc" | "desc") {
  if (sorted === "asc") {
    return "ascending";
  }

  return sorted === "desc" ? "descending" : undefined;
}

function SortButton({
  column,
  label,
}: {
  // Structural, because Column is invariant in its value type.
  column: {
    getIsSorted: () => false | "asc" | "desc";
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
  };
  label: string;
}) {
  const sorted = column.getIsSorted();
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-2 h-7 px-2 text-xs",
        sorted ? "text-foreground" : "text-muted-foreground",
      )}
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <Icon className="size-3.5" />
    </Button>
  );
}

// The follow-up warning as a kunyit dot and a line of text. Under its own
// column header the short form is enough; the full reason is the tooltip.
function FollowUpMark({
  followUp,
  short = false,
  className,
}: {
  followUp: FollowUpState;
  short?: boolean;
  className?: string;
}) {
  const label = followUpLabel(followUp);

  if (!label) {
    return null;
  }

  const text = !short
    ? label
    : followUp.suggestGhosted
      ? `${followUp.daysInStatus} hari tanpa kabar`
      : `${followUp.daysSinceActivity} hari menunggu`;

  return (
    <span
      title={short ? label : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-figure text-xs font-medium text-kunyit-tua",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-kunyit" />
      {text}
    </span>
  );
}

function RowActions({ application }: { application: ApplicationListItem }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Aksi untuk ${application.position} di ${application.companyName}`}
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={() => router.push(`/applications/${application.id}`)}
          >
            Lihat detail
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/applications/${application.id}/edit`)}
          >
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteApplicationDialog
        applicationId={application.id}
        label={`${application.position} di ${application.companyName}`}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}

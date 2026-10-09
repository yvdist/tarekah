"use client";

import { Search } from "lucide-react";
import { createContext, use, useState } from "react";
import { OptionSelect } from "@/components/option-select";
import { Input } from "@/components/ui/input";
import type { JobSource } from "@/db/schema/enum-values";
import { EMPTY_BOARD_FILTER, type BoardFilter } from "../board-filter";
import { SOURCE_OPTIONS } from "../labels";

const SOURCE_FILTER_OPTIONS: ReadonlyArray<{
  value: JobSource | "all";
  label: string;
}> = [{ value: "all", label: "Sumber: semua" }, ...SOURCE_OPTIONS];

const BoardFilterContext = createContext<{
  filter: BoardFilter;
  setFilter: (filter: BoardFilter) => void;
}>({ filter: EMPTY_BOARD_FILTER, setFilter: () => {} });

// The toolbar sits in the page header and the board below it, so the filter
// they share lives in a provider around both. It only hides cards on screen,
// which is why it is not in the URL.
export function BoardFilterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState(EMPTY_BOARD_FILTER);

  return (
    <BoardFilterContext value={{ filter, setFilter }}>
      {children}
    </BoardFilterContext>
  );
}

export const useBoardFilter = () => use(BoardFilterContext).filter;

export function BoardToolbar() {
  const { filter, setFilter } = use(BoardFilterContext);

  return (
    <>
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={filter.query}
          onChange={(event) =>
            setFilter({ ...filter, query: event.target.value })
          }
          aria-label="Cari perusahaan atau posisi"
          placeholder="Cari perusahaan atau posisi"
          className="h-10 pl-9"
        />
      </div>
      <OptionSelect
        value={filter.source}
        onValueChange={(source) => setFilter({ ...filter, source })}
        options={SOURCE_FILTER_OPTIONS}
        aria-label="Filter sumber"
        className="h-10!"
      />
    </>
  );
}

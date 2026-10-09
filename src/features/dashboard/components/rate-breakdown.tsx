import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent } from "../format";
import { RateChart } from "./rate-chart";

export type RateBreakdownRow = {
  key: string;
  label: string;
  submitted: number;
  responded: number;
  interviewed: number;
  responseRate: number | null;
  interviewRate: number | null;
};

// The chart compares the rates; the table underneath keeps the counts behind
// them in view, since a rate over three applications says little.
export function RateBreakdown({
  dimension,
  rows,
}: {
  dimension: string;
  rows: ReadonlyArray<RateBreakdownRow>;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Belum ada lamaran terkirim pada rentang ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RateChart
        data={rows.map((row) => ({
          label: row.label,
          responseRate: row.responseRate ?? 0,
          interviewRate: row.interviewRate ?? 0,
        }))}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dimension}</TableHead>
            <TableHead className="text-right">Terkirim</TableHead>
            <TableHead className="text-right">Direspons</TableHead>
            <TableHead className="text-right">Interview</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {row.submitted}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.responded}
                <span className="text-muted-foreground">
                  {" · "}
                  {formatPercent(row.responseRate)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.interviewed}
                <span className="text-muted-foreground">
                  {" · "}
                  {formatPercent(row.interviewRate)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

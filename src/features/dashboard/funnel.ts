// Adds to each stage the share of its applications that went on to the next
// one, as a whole percentage. Null for the last stage and for a stage nothing
// reached, where there is nothing to divide by.
export function withConversion<T extends { count: number }>(
  stages: ReadonlyArray<T>,
): Array<T & { conversion: number | null }> {
  return stages.map((stage, index) => {
    const next = stages[index + 1];

    return {
      ...stage,
      conversion:
        next && stage.count > 0
          ? Math.round((next.count / stage.count) * 100)
          : null,
    };
  });
}

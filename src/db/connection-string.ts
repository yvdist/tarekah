// Neon's connection strings say `sslmode=require`. The driver reads that, and
// `prefer` and `verify-ca`, as full certificate verification, and warns on
// every start that its next major version will not: `require` will then mean
// encryption without checking who is on the other end. This says what is
// meant, which keeps today's behaviour and the warning away.
export function withVerifiedSsl(connectionString: string): string {
  return connectionString.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/,
    "$1verify-full",
  );
}

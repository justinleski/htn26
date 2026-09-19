export class CsvParseError extends Error {
  constructor(message: string, readonly row?: number) {
    super(row ? `${message} (row ${row})` : message);
    this.name = "CsvParseError";
  }
}

export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    const next = input[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new CsvParseError("Unterminated quoted field");
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0]!.map((header) => header.trim());
  if (headers.some((header) => header.length === 0)) {
    throw new CsvParseError("CSV headers cannot be blank", 1);
  }
  if (new Set(headers).size !== headers.length) {
    throw new CsvParseError("CSV headers must be unique", 1);
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new CsvParseError(`Expected ${headers.length} columns but received ${values.length}`, index + 2);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]!.trim()]));
  });
}

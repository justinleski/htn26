export type EvidenceRecordType = "product" | "review" | "ad";

export class IndexingAfterPersistenceError extends Error {
  readonly stage = "index";

  constructor(
    readonly recordType: EvidenceRecordType,
    readonly persisted: number,
    cause: unknown,
  ) {
    super(
      `${persisted} ${recordType} record(s) were persisted but Elasticsearch indexing failed; run merchant reindex`,
      { cause },
    );
    this.name = "IndexingAfterPersistenceError";
  }
}

import { resolve } from "node:path";
import {
  importAdPerformanceAndIndex,
  importReviewsAndIndex,
  loadDemoDataset,
  reindexMerchantEvidence,
  type ImportFormat,
} from "@htn26/backend";
import type { ActionFunctionArgs } from "react-router";
import { Form, useActionData, useNavigation } from "react-router";
import { authenticateMerchant, reportRouteError, requireSearchPlatform } from "../platform.server";

async function importPayload(form: FormData): Promise<string> {
  const file = form.get("file");
  if (file instanceof File && file.size > 0) return file.text();
  return String(form.get("payload") || "");
}

export const action = async ({ request }: ActionFunctionArgs) => {
  let merchantId: string | undefined;
  try {
    const authenticated = await authenticateMerchant(request);
    merchantId = authenticated.merchantId;
    const platform = await requireSearchPlatform();
    const form = await request.formData();
    const mode = String(form.get("mode") || "");
    if (mode === "demo") {
      const loaded = await loadDemoDataset({
        merchantId,
        repository: platform.repositories,
        productRepository: platform.repositories,
        demoDirectory: process.env.DEMO_DATA_DIR || resolve(process.cwd(), "../../data/demo"),
      });
      const indexed = await reindexMerchantEvidence({ merchantId, repository: platform.repositories, elastic: platform.elastic });
      return { ok: true as const, message: `Loaded ${loaded.reviews.unique} reviews and ${loaded.ads.unique} ads; indexed ${indexed.indexed} records.` };
    }
    const format = String(form.get("format") || "json") as ImportFormat;
    const input = await importPayload(form);
    if (mode === "reviews") {
      const result = await importReviewsAndIndex({ merchantId, input, format, attribution: "imported", repository: platform.repositories, elastic: platform.elastic });
      return { ok: true as const, message: `Imported ${result.imported.unique} review(s).` };
    }
    if (mode === "ads") {
      const result = await importAdPerformanceAndIndex({ merchantId, input, format, attribution: "imported", repository: platform.repositories, elastic: platform.elastic });
      return { ok: true as const, message: `Imported ${result.imported.unique} ad record(s).` };
    }
    throw new Error("Choose demo, reviews, or ads import mode");
  } catch (error) {
    return { ok: false as const, error: reportRouteError(error, "data.import", merchantId) };
  }
};

export default function ImportData() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  return (
    <s-page heading="Import marketing data">
      <s-section heading="Rain-jacket demo">
        <s-paragraph>Load the deterministic product, six reviews, and four campaign records. Repeated loads are idempotent.</s-paragraph>
        <Form method="post"><input type="hidden" name="mode" value="demo" /><s-button type="submit" {...(busy ? { loading: true } : {})}>Load demo dataset</s-button></Form>
      </s-section>
      <s-section heading="CSV or JSON import">
        <s-paragraph>Product IDs must match a synchronized product ID. Imports are limited to 5 MB and 10,000 rows.</s-paragraph>
        <Form method="post" encType="multipart/form-data">
          <p><label>Data type <select name="mode" defaultValue="reviews"><option value="reviews">Reviews</option><option value="ads">Ad performance</option></select></label></p>
          <p><label>Format <select name="format" defaultValue="json"><option value="json">JSON</option><option value="csv">CSV</option></select></label></p>
          <p><label>Upload file <input type="file" name="file" accept=".csv,.json,text/csv,application/json" /></label></p>
          <p><label>Or paste data<br /><textarea name="payload" rows={10} cols={72} /></label></p>
          <s-button type="submit" {...(busy ? { loading: true } : {})}>Import</s-button>
        </Form>
        {result?.ok && <s-paragraph>{result.message}</s-paragraph>}
        {result && !result.ok && <s-paragraph>Error: {result.error}</s-paragraph>}
      </s-section>
    </s-page>
  );
}

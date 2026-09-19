import { reindexMerchantEvidence } from "@htn26/backend";
import type { ActionFunctionArgs } from "react-router";
import { Form, useActionData, useNavigation } from "react-router";
import { authenticateMerchant, reportRouteError, requireSearchPlatform } from "../platform.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  let merchantId: string | undefined;
  try {
    const authenticated = await authenticateMerchant(request);
    merchantId = authenticated.merchantId;
    const platform = await requireSearchPlatform();
    const result = await reindexMerchantEvidence({ merchantId, repository: platform.repositories, elastic: platform.elastic });
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error: reportRouteError(error, "elasticsearch.reindex", merchantId) };
  }
};

export default function Reindex() {
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  return (
    <s-page heading="Rebuild search index">
      <s-section heading="PostgreSQL to Elasticsearch recovery">
        <s-paragraph>Use this after Elasticsearch downtime or a partial indexing failure. PostgreSQL remains the source of truth.</s-paragraph>
        <Form method="post"><s-button type="submit" {...(navigation.state !== "idle" ? { loading: true } : {})}>Reindex merchant data</s-button></Form>
        {result?.ok && <s-paragraph>Indexed {result.result.indexed} record(s) in {result.result.batches} batch(es).</s-paragraph>}
        {result && !result.ok && <s-paragraph>Error: {result.error}</s-paragraph>}
      </s-section>
    </s-page>
  );
}

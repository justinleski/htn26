import type { Session, Shopify } from "@shopify/shopify-api";

// Legacy installation requires shop-specific subscriptions. Keep unrelated
// subscriptions intact and check the exact topic + URI before creating one.
export async function ensureUninstallWebhook(api: Shopify, session: Session, origin: string): Promise<void> {
  const client = new api.clients.Graphql({ session });
  const uri = `${origin}/webhooks/app/uninstalled`;
  const exists = async () => {
    const result = await client.request<{ webhookSubscriptions: { nodes: { id: string }[] } }>(`
      query AdgileUninstallWebhook($uri: String!) {
        webhookSubscriptions(first: 1, topics: [APP_UNINSTALLED], uri: $uri) { nodes { id } }
      }`, { variables: { uri } });
    if (!result.data?.webhookSubscriptions) throw new Error("Could not verify uninstall webhook");
    return result.data.webhookSubscriptions.nodes.length > 0;
  };
  if (await exists()) return;
  const result = await client.request<{ webhookSubscriptionCreate: {
    webhookSubscription: { id: string } | null; userErrors: { message: string }[];
  } }>(`
    mutation AdgileCreateUninstallWebhook($subscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: APP_UNINSTALLED, webhookSubscription: $subscription) {
        webhookSubscription { id }
        userErrors { message }
      }
    }`, { variables: { subscription: { uri, format: "JSON" } } });
  const created = result.data?.webhookSubscriptionCreate;
  if (created?.webhookSubscription && created.userErrors.length === 0) return;
  // Concurrent sign-ins can race to create the same subscription.
  if (await exists()) return;
  throw new Error("Could not register uninstall webhook");
}

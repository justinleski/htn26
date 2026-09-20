# Campaign generation

The standalone frontend uses the Backboard pipeline from `lifes30daytrial`'s
`c47ee2b` commit on `dev3-ai` (analyze evidence, generate a draft, check claims).
The implementation is connected through authenticated `/api/generate` and
merchant-scoped `/api/campaigns` endpoints. Completed campaigns and generation
runs are stored in Postgres; history and reopen read those persisted records.

## Configuration

Set `BACKBOARD_API_KEY` in the backend environment. Optional `BACKBOARD_PROVIDER`
and `BACKBOARD_MODEL` override the defaults in `src/ai/model.ts`.
Set `GPTZERO_API_KEY` to enable the default generation decorator. It checks
generated text, asks the provider for one bounded revision when GPTZero finds
likely AI-generated phrasing, and rejects output that remains above the
threshold. The Backboard pipeline does not rescan unchanged prior-stage model
output as input because that output was already supervised; callers that pass
independently generated or transformed input can set `superviseInput: true`.
`GPTZERO_API_KEY` is optional so local scripted providers continue to work
without a network call. GPTZero is a style/provenance signal; it cannot
independently establish factual accuracy, so evidence and claim validation
remain required.
Confirm the selected model is available in your Backboard account before a live
demo. The configured default is `openrouter` / `openai/gpt-4o-mini`.
Credentials remain on the server. Each stage uses a fresh Backboard thread with
memory and web search disabled. No merchant conversation is shared with another.

The production retriever reads the signed-in merchant's product, reviews, and ad
history from Postgres. It does not fall back to fixtures. A product must have at
least one review or historical ad. Demo evidence is explicitly imported and labelled.

## Generic text provider compatibility

Implement `TextGenerator` from `src/generation/text.ts`:

```ts
interface TextGenerator {
  generateText(request: {
    instructions: string;
    prompt: string;
    signal: AbortSignal;
  }): Promise<string>;
}
```

Wrap it with `createTextModelClient(generator)` from `src/ai/model.ts`, then inject
that `ModelClient` into `generateMerchantCampaign` or `generateCampaign`.
The bridge accepts ordinary JSON text or a JSON code fence and maps failures to
pipeline errors. Providers do not need native structured output, tools, or streaming.
Each pipeline stage validates its own output with Zod. The standalone pipeline
bounds each of its three model calls to 45 seconds and uses one attempt per stage.
Adapters should honor the abort signal; timing out cannot guarantee cancellation
of remote work in an adapter that ignores it.

Source IDs must belong to supplied evidence. Claim review can remove or rewrite
unsupported wording; rewrites also require valid citations. This is model-assisted
review, not a guarantee of factual accuracy or complete claim coverage. Campaigns
are drafts for merchant review, and this app does not publish ads.

## Verification

`npm test` covers valid output, citations, claim edits, schema errors, timeouts,
persistence, generic text adaptation, and OAuth session validation.

`npm run check:standalone -w @htn26/backend` uses the configured Postgres database
with unique temporary merchants and a scripted text provider. It verifies OAuth
session storage, imports, dashboard metrics, campaign save/reopen, merchant
isolation, and logout, then removes only its own temporary records. It does not
contact Shopify or Backboard and does not establish live provider readiness.

`npm run check:backboard -w @htn26/backend` makes real, billable Backboard calls
using synthetic repository evidence and in-memory persistence. The three-stage
check passed with `openrouter` / `openai/gpt-4o-mini`; the imported Llama 3.3 8B
model name was unsupported, and tested Llama alternatives failed the JSON contract.
No API key is included in this script or its output.

Shopify consent and successful real product sync remain separate live acceptance
checks. Passing one synthetic generation does not guarantee every future response.

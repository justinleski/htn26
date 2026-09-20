import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { generateStructuredText, GenerationError, type TextGenerator } from "../src/generation/text.js";
import { withGPTZeroSupervision, type GPTZeroAssessment } from "../src/generation/gptzero.js";
import { assertEvidenceReferences, CampaignDraftSchema } from "../src/generation/contracts.js";
import { createTextModelClient } from "../src/ai/model.js";

const schema = z.object({ text: z.string().min(1) }).strict();
const request = { schema, instructions: "Write a caption.", prompt: "Evidence supplied by the application." };
const returns = (text: string): TextGenerator => ({ generateText: async () => text });
const hasCode = (code: GenerationError["code"]) => (error: unknown) =>
  error instanceof GenerationError && error.code === code;

test("generic text providers plug into the imported AI pipeline contract", async () => {
  const model = createTextModelClient(returns('{"findings":["supported observation"]}'));
  assert.deepEqual(await model.completeJson({ system: "Analyze supplied evidence", user: "Evidence" }), { findings: ["supported observation"] });
});

test("plain text adapters are interchangeable and receive the output contract", async () => {
  for (const generator of [returns('{"text":"A"}'), returns('```json\n{"text":"B"}\n```')]) {
    const result = await generateStructuredText({ ...request, generator });
    assert.ok(["A", "B"].includes(result.text));
  }
  await generateStructuredText({ ...request, generator: {
    async generateText(input) {
      assert.ok(input.instructions.includes('"required"'));
      assert.equal(input.prompt, request.prompt);
      assert.equal(input.signal.aborted, false);
      return '{"text":"ok"}';
    },
  } });
});

test("invalid JSON, wrong schema, and excessive output fail closed", async () => {
  for (const output of ["not JSON", '{"text":42}', '{"text":"ok","extra":true}', "x".repeat(262145)]) {
    await assert.rejects(generateStructuredText({ ...request, generator: returns(output) }), hasCode("invalid-output"));
  }
});

test("provider errors do not expose credentials or imported evidence", async () => {
  await assert.rejects(generateStructuredText({ ...request, generator: {
    async generateText() { throw new Error("secret-key and private evidence"); },
  } }), (error: unknown) => hasCode("provider-failed")(error) && !String(error).includes("secret-key"));
});

test("timeouts settle even when an adapter ignores cancellation", async () => {
  let signal: AbortSignal | undefined;
  await assert.rejects(generateStructuredText({ ...request, timeoutMs: 10, generator: {
    generateText(input) { signal = input.signal; return new Promise(() => {}); },
  } }), hasCode("timeout"));
  assert.equal(signal?.aborted, true);
});

test("already-cancelled requests never call the adapter", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generateStructuredText({ ...request, signal: controller.signal, generator: {
    async generateText() { assert.fail("adapter should not run"); },
  } }), hasCode("cancelled"));
});

test("in-flight caller cancellation reaches the adapter and settles the request", async () => {
  const controller = new AbortController();
  await assert.rejects(generateStructuredText({ ...request, signal: controller.signal, generator: {
    generateText(input) {
      controller.abort();
      assert.equal(input.signal.aborted, true);
      return new Promise(() => {});
    },
  } }), hasCode("cancelled"));
});

test("GPTZero supervision checks upstream input and revises flagged output", async () => {
  const assessments: GPTZeroAssessment[] = [
    { aiProbability: 0.95 },
    { aiProbability: 0.91 },
    { aiProbability: 0.1 },
  ];
  const instructions: string[] = [];
  let calls = 0;
  const generator = withGPTZeroSupervision(
    { async generateText(request) { instructions.push(request.instructions); calls += 1; return calls === 1 ? "first" : "revised"; } },
    { async assess() { return assessments.shift() ?? { aiProbability: 0.1 }; } },
  );

  assert.equal(await generator.generateText({
    instructions: "Return text.", prompt: "LLM-created evidence", signal: new AbortController().signal,
  }), "revised");
  assert.equal(calls, 2);
  assert.equal(instructions[0]?.includes("AI-generated"), true);
  assert.equal(instructions[1]?.includes("generic AI phrasing"), true);
});

test("GPTZero supervision fails closed after the revision budget", async () => {
  const generator = withGPTZeroSupervision(
    { async generateText() { return "still generic"; } },
    { async assess() { return { aiProbability: 1 }; } },
    { maxRevisions: 1 },
  );
  await assert.rejects(generator.generateText({
    instructions: "Return text.", prompt: "Evidence", signal: new AbortController().signal,
  }), /GPTZero rejected generated text/);
});

const draft = {
  objective: "Awareness", audience: "Commuters", strategy: "Test a review-led hook",
  hooks: ["One", "Two", "Three"], captions: ["One", "Two", "Three"],
  variants: [
    { name: "A", content: "One", changedElement: "hook", hypothesis: "Review-led hook may improve CTR" },
    { name: "B", content: "Two", changedElement: "hook", hypothesis: "Product-led hook may improve CTR" },
  ],
  supportingSourceIds: ["review-1"],
};

test("generation cannot supply merchant identity or its own validation verdict", () => {
  assert.equal(CampaignDraftSchema.safeParse(draft).success, true);
  for (const extra of [{ merchantId: "other" }, { validationResults: ["passed"] }, { id: "chosen-id" }]) {
    assert.equal(CampaignDraftSchema.safeParse({ ...draft, ...extra }).success, false);
  }
});

test("campaign evidence references must exist in the server-supplied evidence", () => {
  const parsed = CampaignDraftSchema.parse(draft);
  assert.doesNotThrow(() => assertEvidenceReferences(parsed, new Set(["review-1"])));
  assert.throws(() => assertEvidenceReferences(parsed, new Set(["different-merchant-review"])));
  assert.throws(() => assertEvidenceReferences({ ...parsed, supportingSourceIds: [] }, new Set(["review-1"])));
});

import { readCopilotSession, type CopilotSessionPayload } from "./copilot-session.server.js";
import { applyCorsHeaders, corsPreflight } from "./cors.server.js";

export type ApiHandler = (ctx: {
  request: Request;
  session: CopilotSessionPayload;
}) => Promise<Response> | Response;

export async function handleApiRequest(
  request: Request,
  handler: ApiHandler,
  options?: { methods?: string[] },
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return corsPreflight(request);
  }

  const allowed = options?.methods ?? ["GET"];
  if (!allowed.includes(request.method)) {
    return applyCorsHeaders(
      request,
      Response.json({ error: "Method not allowed" }, { status: 405 }),
    );
  }

  const auth = readCopilotSession(request);
  if (!auth.ok) {
    return applyCorsHeaders(request, auth.response);
  }

  try {
    const response = await handler({ request, session: auth.session });
    return applyCorsHeaders(request, response);
  } catch (error) {
    if (error instanceof Response) {
      return applyCorsHeaders(request, error);
    }
    const message = error instanceof Error ? error.message : String(error);
    return applyCorsHeaders(
      request,
      Response.json({ error: message }, { status: 500 }),
    );
  }
}

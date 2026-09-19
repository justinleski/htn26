import { checkPlatformHealth } from "@htn26/backend";

export const loader = async () => {
  const health = await checkPlatformHealth();
  return Response.json(health, { status: health.status === "ok" ? 200 : 503 });
};

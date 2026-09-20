import type { LoaderFunctionArgs } from "react-router";
import { frontendResponse } from "../../lib/frontend.server";
export const loader = ({ request }: LoaderFunctionArgs) => frontendResponse(request);

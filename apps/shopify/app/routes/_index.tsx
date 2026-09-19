import type { LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) throw redirect(`/app?${url.searchParams.toString()}`);
  return { showLogin: Boolean(login) };
};

export default function Landing() {
  const { showLogin } = useLoaderData<typeof loader>();
  return (
    <main style={{ maxWidth: 760, margin: "64px auto", fontFamily: "Inter, sans-serif", padding: 24 }}>
      <h1>Marketing Copilot for Shopify</h1>
      <p>Synchronize products, import reviews and campaign performance, and surface evidence-backed marketing metrics.</p>
      {showLogin && (
        <Form method="post" action="/auth/login">
          <label>Shop domain <input name="shop" placeholder="example.myshopify.com" /></label>{" "}
          <button type="submit">Log in</button>
        </Form>
      )}
    </main>
  );
}

import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

import { beginStandaloneOAuth } from "../../lib/standalone-oauth.server";
import { loginErrorMessage } from "./error.server";

async function shopFromRequest(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("shop");
  if (fromQuery) return fromQuery;
  if (request.method === "GET") return null;
  const form = await request.formData();
  const fromForm = form.get("shop");
  return typeof fromForm === "string" ? fromForm : null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const shop = await shopFromRequest(request);
  if (shop) {
    return beginStandaloneOAuth(request, shop);
  }
  return { errors: loginErrorMessage({}) };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const shop = await shopFromRequest(request);
  if (!shop?.trim()) {
    return {
      errors: loginErrorMessage({ shop: LoginErrorType.MissingShop }),
    };
  }
  return beginStandaloneOAuth(request, shop);
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <Form method="post">
          <s-section heading="Log in">
            <s-text-field
              name="shop"
              label="Shop domain"
              details="example.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.currentTarget.value)}
              autocomplete="on"
              error={errors.shop}
            ></s-text-field>
            <s-button type="submit">Log in</s-button>
          </s-section>
        </Form>
      </s-page>
    </AppProvider>
  );
}

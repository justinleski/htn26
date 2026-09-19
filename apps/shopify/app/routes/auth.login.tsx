import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { LoginErrorType, type LoginError } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../shopify.server";

function message(errors: LoginError): { shop?: string } {
  if (errors?.shop === LoginErrorType.MissingShop) return { shop: "Enter your shop domain" };
  if (errors?.shop === LoginErrorType.InvalidShop) return { shop: "Enter a valid shop domain" };
  return {};
}

export const loader = async ({ request }: LoaderFunctionArgs) => ({ errors: message(await login(request)) });
export const action = async ({ request }: ActionFunctionArgs) => ({ errors: message(await login(request)) });

export default function Login() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors ?? loaderData.errors;
  return (
    <AppProvider embedded={false}>
      <s-page heading="Connect your Shopify store">
        <s-section>
          <Form method="post">
            <s-text-field name="shop" label="Shop domain" details="example.myshopify.com" value={shop} onChange={(event) => setShop(event.currentTarget.value)} error={errors.shop} />
            <s-button type="submit">Log in</s-button>
          </Form>
        </s-section>
      </s-page>
    </AppProvider>
  );
}

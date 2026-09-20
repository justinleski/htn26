declare module "*.css";

import type * as React from "react";

/**
 * App Bridge / Polaris web component used for embedded app nav.
 * Not yet shipped in @shopify/polaris-types 1.0.x.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "s-app-nav": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

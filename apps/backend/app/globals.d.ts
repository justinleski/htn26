declare module "*.css";

/**
 * App Bridge / Polaris web component used for embedded app nav.
 * Not yet shipped in @shopify/polaris-types 1.0.x.
 */
declare namespace JSX {
  interface IntrinsicElements {
    "s-app-nav": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    >;
  }
}

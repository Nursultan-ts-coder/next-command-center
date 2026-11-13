/**
 * Opt-in class names for the input looks defined once in the theme (`MuiTextField` and
 * `MuiAutocomplete` overrides in `src/app/theme/components.tsx`). Put one on the `TextField` or
 * `Autocomplete` root; local styles then only add size and spacing.
 */
export const fieldClasses = {
  /** Translucent pill with a faint gradient border: filter bars and page headers. */
  pill: 'AppField-pill',
  /** Bordered field with the theme corner radius: forms and modals. */
  form: 'AppField-form',
} as const;

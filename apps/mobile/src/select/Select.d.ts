// Metro picks `Select.android.tsx` or `Select.ios.tsx`; tsc has no platform suffixes, so it
// reads this declaration instead. Both implementations take the same `SelectProps`.
import type { JSX } from "react";
import type { SelectProps } from "./SelectField";

export declare function Select(props: SelectProps): JSX.Element;

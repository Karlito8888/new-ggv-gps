import { Spinner as RadixSpinner } from "@radix-ui/themes";

/**
 * Radix UI Spinner component
 * Simple wrapper around Radix UI Themes Spinner
 */
const Spinner = ({ size = "2", ...props }) => {
  return <RadixSpinner size={size} {...props} />;
};

export default Spinner;
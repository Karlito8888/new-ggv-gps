import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva(
  "animate-spin text-green-500",
  {
    variants: {
      size: {
        default: "h-5 w-5",
        sm: "h-4 w-4",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const Spinner = ({ className, size, ...props }) => {
  return (
    <svg
      className={cn(spinnerVariants({ size, className }))}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        strokeWidth="4"
        stroke="currentColor"
      />
      <circle
        className="opacity-75"
        cx="12"
        cy="12"
        r="10"
        strokeWidth="4"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
};

export { Spinner };
import { cn } from "@/lib/utils";

const Card = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-card bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  );
};

export { Card };
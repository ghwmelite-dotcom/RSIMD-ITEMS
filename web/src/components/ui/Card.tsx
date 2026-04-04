import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddings = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800/50 rounded-2xl shadow-warm ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

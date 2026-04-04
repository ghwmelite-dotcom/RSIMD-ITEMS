interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "gold" | "red" | "gray";
  className?: string;
}

const variants = {
  green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  gold: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  gray: "bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

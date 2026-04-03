interface BadgeProps {
  children: React.ReactNode;
  variant?: "green" | "gold" | "red" | "gray";
  className?: string;
}

const variants = {
  green: "bg-green-100 text-green-800",
  gold: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
  gray: "bg-gray-100 text-gray-800",
};

export function Badge({ children, variant = "gray", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

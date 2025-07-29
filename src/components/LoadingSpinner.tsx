import { cn } from "@/lib/utils";
import tractorWheel from "@/assets/tractor-wheel.jpg";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const LoadingSpinner = ({ 
  size = "md", 
  className,
  text = "Loading..." 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3",
      className
    )}>
      <div className={cn(
        "relative rounded-full overflow-hidden border-4 border-primary/20 tractor-spin",
        sizeClasses[size]
      )}>
        <img 
          src={tractorWheel}
          alt="Loading"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20" />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};
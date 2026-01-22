import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
}

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center text-center px-4">
      {icon && (
        <div className="mb-4 p-4 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-display font-semibold text-xl text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  blur?: boolean;
}

export function LoadingOverlay({ message, blur = true }: LoadingOverlayProps) {
  return (
    <div className={`absolute inset-0 ${blur ? 'backdrop-blur-sm' : ''} bg-background/70 z-50 flex flex-col items-center justify-center`}>
      <LoadingSpinner size="lg" />
      {message && <p className="mt-3 text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  );
}

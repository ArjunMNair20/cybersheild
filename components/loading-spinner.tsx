'use client';

import { Shield } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <div className="relative">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-[spin_3s_linear_infinite]" />
        <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-[spin_1.5s_linear_infinite]" />
        <Shield className="w-12 h-12 text-primary animate-pulse" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">
        Initializing Secure Connection...
      </p>
    </div>
  );
}

export function InitializingOverlay() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="glow-effect absolute inset-0 rounded-lg opacity-50" />
        <LoadingSpinner />
      </div>
    </div>
  );
} 
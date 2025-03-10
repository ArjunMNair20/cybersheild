'use client';

import { Shield, Lock, Key } from 'lucide-react';

export function SecurityCard() {
  return (
    <div className="card slide-in glass">
      <div className="flex flex-col items-center text-center">
        <div className="glow-effect p-4 rounded-full bg-primary/10 mb-6">
          <Shield size={48} className="text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold mb-3 gradient-text">Secure Messaging</h2>
        <p className="text-muted-foreground">
          Your messages are protected with end-to-end encryption and blockchain security.
        </p>
      </div>
    </div>
  );
}

export function LockIcon() {
  return (
    <div className="icon fade-in glass p-3 rounded-full">
      <Lock size={32} className="text-primary" />
    </div>
  );
}

export function KeyIcon() {
  return (
    <div className="icon fade-in glass p-3 rounded-full">
      <Key size={32} className="text-primary" />
    </div>
  );
}

export function SecurityFeature({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="card glass fade-in p-6 flex flex-col items-center text-center">
      <div className="glow-effect p-4 rounded-full bg-primary/10 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 gradient-text">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
} 
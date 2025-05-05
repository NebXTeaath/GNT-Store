
import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, ShieldCheck, Truck, Headphones } from 'lucide-react';

export type BadgeTheme = 'primary' | 'secondary' | 'outline' | 'ghost';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface TrustBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  theme?: BadgeTheme;
  size?: BadgeSize;
  className?: string;
}

const themeClasses = {
  primary: 'bg-[#5865f2]/10 border border-[#5865f2]/20 text-white',
  secondary: 'bg-[#EFBF04]/10 border border-[#EFBF04]/20 text-white',
  outline: 'bg-transparent border border-[#2a2d36] text-white',
  ghost: 'bg-[#1a1c23] border border-[#2a2d36] text-white',
};

const sizeClasses = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-base',
  lg: 'p-5 text-lg',
};

const iconSizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

export const TrustBadge = ({
  icon,
  title,
  description,
  theme = 'primary',
  size = 'md',
  className,
}: TrustBadgeProps) => {
  return (
    <div 
      className={cn(
        'rounded-lg flex items-start transition-all duration-300 hover:shadow-md hover:border-[#5865f2]/40', 
        themeClasses[theme],
        sizeClasses[size],
        className
      )}
    >
      <div className={cn('text-[#5865f2] mr-3 mt-0.5', iconSizeClasses[size])}>
        {icon}
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-gray-300 text-sm font-light">{description}</p>
      </div>
    </div>
  );
};

export const WarrantyBadge = ({ size, theme, className }: Omit<TrustBadgeProps, 'icon' | 'title' | 'description'>) => {
  return (
    <TrustBadge
      icon={<ShieldCheck />}
      title="Assured Warranty"
      description="Dedicated support channels & direct brand engagement"
      theme={theme}
      size={size}
      className={className}
    />
  );
};

export const SecureDeliveryBadge = ({ size, theme, className }: Omit<TrustBadgeProps, 'icon' | 'title' | 'description'>) => {
  return (
    <TrustBadge
      icon={<Truck />}
      title="Secure Delivery"
      description="Safe, tracked & reliable shipping across India"
      theme={theme}
      size={size}
      className={className}
    />
  );
};

export const CustomerSupportBadge = ({ size, theme, className }: Omit<TrustBadgeProps, 'icon' | 'title' | 'description'>) => {
  return (
    <TrustBadge
      icon={<Headphones />}
      title="24/7 Support"
      description="Get help anytime via chat, call or email"
      theme={theme}
      size={size}
      className={className}
    />
  );
};

export const AuthenticProductBadge = ({ size, theme, className }: Omit<TrustBadgeProps, 'icon' | 'title' | 'description'>) => {
  return (
    <TrustBadge
      icon={<Shield />}
      title="100% Authentic"
      description="All products are verified & genuine"
      theme={theme}
      size={size}
      className={className}
    />
  );
};



import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  contentClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  footer,
  headerAction,
  contentClassName = 'p-6',
  onClick,
}) => {
  return (
    <div 
      className={`bg-white dark:bg-black border border-gray-100 dark:border-white/10 rounded-2xl shadow-sm transition-colors duration-300 ${!className.includes('overflow-') ? 'overflow-hidden' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-50 dark:border-white/10 flex items-center justify-between">
          <div>
            {title && <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-none">{title}</h3>}
            {subtitle && <p className="text-[10px] text-gray-400 dark:text-white/60 font-medium mt-1 uppercase tracking-tight">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={contentClassName}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 italic text-gray-600 dark:text-gray-400">
          {footer}
        </div>
      )}
    </div>
  );
};

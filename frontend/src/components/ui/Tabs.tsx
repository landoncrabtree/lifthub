import { useRef, useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);

  const focusTab = useCallback((index: number) => {
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    );
    buttons?.[index]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const currentIndex = enabledTabs.findIndex((t) => t.value === value);

      let nextIndex: number | null = null;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % enabledTabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex =
          (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = enabledTabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const next = enabledTabs[nextIndex];
        onChange(next.value);
        // Find the visual index in the full tabs array
        const visualIndex = tabs.findIndex((t) => t.value === next.value);
        // Find the button index among enabled buttons
        const enabledVisualIndex = tabs
          .filter((t) => !t.disabled)
          .findIndex((t) => t.value === next.value);
        focusTab(enabledVisualIndex >= 0 ? enabledVisualIndex : visualIndex);
      }
    },
    [tabs, value, onChange, focusTab],
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        'flex gap-1 border-b border-[var(--color-border)]',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.value}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:rounded-md',
              isActive
                ? 'text-brand-500'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
              tab.disabled && 'pointer-events-none opacity-40',
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Companion panel — renders content for the active tab */
export interface TabPanelProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, activeValue, children, className }: TabPanelProps) {
  if (value !== activeValue) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn('focus:outline-none', className)}
    >
      {children}
    </div>
  );
}

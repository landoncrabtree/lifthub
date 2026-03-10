import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface SectionNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface SectionNavProps {
  items: SectionNavItem[];
}

export function SectionNav({ items }: SectionNavProps) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto scrollbar-hide">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-brand-600 text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`
          }
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

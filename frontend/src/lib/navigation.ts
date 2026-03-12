import {
  Dumbbell,
  ClipboardList,
  CalendarDays,
  Apple,
  UtensilsCrossed,
  BookOpen,
  BarChart3,
} from 'lucide-react';

export const workoutNavItems = [
  { to: '/templates', label: 'Templates', icon: ClipboardList },
  { to: '/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/stats', label: 'Stats', icon: CalendarDays },
];

export const nutritionNavItems = [
  { to: '/nutrition', label: 'Summary', icon: Apple, end: true },
  { to: '/nutrition/log', label: 'Food Log', icon: UtensilsCrossed },
  { to: '/nutrition/meals', label: 'Custom Meals', icon: BookOpen },
  { to: '/nutrition/progress', label: 'Progress', icon: BarChart3 },
];

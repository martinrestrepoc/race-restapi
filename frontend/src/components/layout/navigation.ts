import {
  Flag,
  LayoutDashboard,
  Medal,
  ShieldCheck,
  Users,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavigationKey =
  | 'dashboard'
  | 'competitors'
  | 'teams'
  | 'races'
  | 'standings'
  | 'administration';

export interface NavigationItem {
  icon: LucideIcon;
  key: NavigationKey;
  label: string;
  mobile?: boolean;
  mobileLabel?: string;
  path: string;
}

export const navigationItems: NavigationItem[] = [
  {
    icon: LayoutDashboard,
    key: 'dashboard',
    label: 'Panel',
    mobile: true,
    path: '/',
  },
  { icon: Flag, key: 'races', label: 'Carreras', mobile: true, path: '/races' },
  {
    icon: Users,
    key: 'competitors',
    label: 'Competidores',
    mobile: true,
    mobileLabel: 'Compet.',
    path: '/competitors',
  },
  {
    icon: UsersRound,
    key: 'teams',
    label: 'Equipos',
    path: '/teams',
  },
  {
    icon: Medal,
    key: 'standings',
    label: 'Clasificación',
    mobile: true,
    mobileLabel: 'Tabla',
    path: '/standings',
  },
  {
    icon: ShieldCheck,
    key: 'administration',
    label: 'Administración',
    path: '/users',
  },
];

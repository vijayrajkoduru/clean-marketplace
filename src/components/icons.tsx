import {
  AirVent,
  Bug,
  Droplets,
  Flower2,
  Hammer,
  PaintRoller,
  Scissors,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  "air-vent": AirVent,
  zap: Zap,
  droplets: Droplets,
  hammer: Hammer,
  bug: Bug,
  flower: Flower2,
  scissors: Scissors,
  "paint-roller": PaintRoller,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden="true" />;
}

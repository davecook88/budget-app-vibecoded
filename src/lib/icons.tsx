import * as LucideIcons from "lucide-react";
import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function toLucideIconName(iconName: string) {
  return (
    iconName.charAt(0).toUpperCase() +
    iconName.slice(1).replace(/-([a-z])/g, (match) => match[1].toUpperCase())
  );
}

export function renderAppIcon(
  iconName: string | null | undefined,
  options?: {
    className?: string;
    fallback?: keyof typeof LucideIcons;
    textClassName?: string;
  }
): ReactNode {
  const className = options?.className;
  const textClassName = options?.textClassName;
  const fallbackName = options?.fallback || "CircleDot";
  const FallbackIcon = (LucideIcons as Record<string, React.ComponentType<IconProps>>)[fallbackName] || LucideIcons.CircleDot;

  if (!iconName) {
    return <FallbackIcon className={className} />;
  }

  if (!/^[a-z0-9-]+$/i.test(iconName)) {
    return <span className={textClassName}>{iconName}</span>;
  }

  const lucideName = toLucideIconName(iconName);
  const Icon = (LucideIcons as Record<string, React.ComponentType<IconProps>>)[lucideName];

  if (!Icon) {
    return <FallbackIcon className={className} />;
  }

  return <Icon className={className} />;
}
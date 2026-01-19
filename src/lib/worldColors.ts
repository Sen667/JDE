/**
 * Centralized world color system for consistent styling across the application
 * Each world (JDE, JDMO, DBCS) has specific colors for buttons, backgrounds, and hover states
 */

export type WorldCode = 'JDE' | 'JDMO' | 'DBCS';

export interface WorldColorScheme {
  primary: string;
  hover: string;
  hoverDarker: string;
  text: string;
  border: string;
  bg: string;
  bgHover: string;
  bgLight: string;
}

export const worldColors: Record<WorldCode, WorldColorScheme> = {
  JDE: {
    primary: 'bg-red-600',
    hover: 'hover:bg-red-700',
    hoverDarker: 'hover:bg-red-800',
    text: 'text-red-600',
    border: 'border-red-600',
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-50',
    bgLight: 'bg-red-50',
  },
  JDMO: {
    primary: 'bg-orange-600',
    hover: 'hover:bg-orange-700',
    hoverDarker: 'hover:bg-orange-800',
    text: 'text-orange-600',
    border: 'border-orange-600',
    bg: 'bg-orange-600',
    bgHover: 'hover:bg-orange-50',
    bgLight: 'bg-orange-50',
  },
  DBCS: {
    primary: 'bg-green-600',
    hover: 'hover:bg-green-700',
    hoverDarker: 'hover:bg-green-800',
    text: 'text-green-600',
    border: 'border-green-600',
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-50',
    bgLight: 'bg-green-50',
  },
};

/**
 * Get the color scheme for a specific world
 */
export const getWorldColors = (worldCode: WorldCode | string | undefined): WorldColorScheme => {
  const code = worldCode?.toUpperCase() as WorldCode;
  return worldColors[code] || worldColors.JDE; // Default to JDE if unknown
};

/**
 * Get filled button classes for a world (colored background with darker hover)
 */
export const getWorldButtonClasses = (worldCode: WorldCode | string | undefined): string => {
  const colors = getWorldColors(worldCode);
  return `${colors.bg} ${colors.hover} text-white shadow-md`;
};

/**
 * Get outline button classes for a world (transparent with colored border and text, light bg hover)
 */
export const getWorldOutlineButtonClasses = (worldCode: WorldCode | string | undefined): string => {
  const colors = getWorldColors(worldCode);
  return `${colors.border} ${colors.text} ${colors.bgHover}`;
};

import React, { createContext, useContext, useState } from 'react';

export type ThemeColor = 'indigo' | 'violet' | 'rose' | 'orange' | 'teal';

export const THEME_COLORS: Record<ThemeColor, string> = {
  indigo: '#4f46e5',
  violet: '#7c3aed',
  rose: '#e11d48',
  orange: '#ea580c',
  teal: '#0d9488',
};

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  themeHex: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeColor>('indigo');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeHex: THEME_COLORS[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

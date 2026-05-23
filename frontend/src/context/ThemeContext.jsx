import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nephro_theme') || 'green'; // 'green' is default
  });

  useEffect(() => {
    // Determine the data-theme attribute, omit if default 'green' since it's the root variables
    const activeTheme = theme === 'green' ? '' : theme;
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('nephro_theme', theme);
  }, [theme]);

  // Support toggle switching or setting directly
  const setAppTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setAppTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

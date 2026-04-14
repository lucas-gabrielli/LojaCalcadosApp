import React, { createContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Pega o tema do celular (agora vai funcionar porque você ajustou o app.json!)
  const systemScheme = useColorScheme(); 
  
  // Estado que guarda a opção escolhida: 'system', 'light' ou 'dark'
  const [themeMode, setThemeMode] = useState('system'); 

  // Calcula se o app deve estar escuro baseado na escolha atual
  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo(
    () => ({
      isDarkMode,
      themeMode,
      setThemeMode, // Nova função para trocar a opção direto
    }),
    [isDarkMode, themeMode]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
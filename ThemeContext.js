import React, { createContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  
  // NOVO: Estado para a Biometria
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Carrega a preferência de biometria ao iniciar o app
  useEffect(() => {
    const loadSettings = async () => {
      const savedBiometry = await AsyncStorage.getItem('@biometry_enabled');
      if (savedBiometry !== null) {
        setIsBiometricEnabled(JSON.parse(savedBiometry));
      }
    };
    loadSettings();
  }, []);

  // Função para salvar a preferência
  const toggleBiometry = async () => {
    const newValue = !isBiometricEnabled;
    setIsBiometricEnabled(newValue);
    await AsyncStorage.setItem('@biometry_enabled', JSON.stringify(newValue));
  };

  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') return systemScheme === 'dark';
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const theme = useMemo(
    () => ({
      isDarkMode,
      themeMode,
      setThemeMode,
      isBiometricEnabled, // Exportando o estado
      toggleBiometry,     // Exportando a função de troca
    }),
    [isDarkMode, themeMode, isBiometricEnabled]
  );

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
import React, { useState, useEffect, useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { 
  NavigationContainer, 
  DefaultTheme, 
  DarkTheme 
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

// 1. IMPORTAÇÕES DO FIREBASE E LOGIN
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import LoginScreen from './LoginScreen';

import { ThemeContext, ThemeProvider } from './ThemeContext';
import ScannerScreen from './ScannerScreen';
import ProdutoScreen from './ProdutoScreen';
import RelatorioScreen from './RelatorioScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ScannerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Escanear Calçado' }} />
      <Stack.Screen name="Produto" component={ProdutoScreen} options={{ title: 'Detalhes do Produto' }} />
    </Stack.Navigator>
  );
}

function NavigationContent() {
  const { isDarkMode } = useContext(ThemeContext);
  
  // CRIAMOS UM TEMA ESCURO CUSTOMIZADO AQUI!
  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#313338', // Fundo das telas vazias
      card: '#2B2D31',       // Fundo da barra inferior
      text: '#F2F3F5',       // Texto padrão
      border: '#1E1F22',     // Linha divisória da barra
      primary: '#5865F2',    // Cor do ícone quando está selecionado
    },
  };

  const navigationTheme = isDarkMode ? CustomDarkTheme : DefaultTheme;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Estoque') iconName = focused ? 'barcode' : 'barcode-outline';
            else if (route.name === 'Relatórios') iconName = focused ? 'document-text' : 'document-text-outline';
            else if (route.name === 'Configurações') iconName = focused ? 'settings' : 'settings-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Estoque" component={ScannerStack} />
        <Tab.Screen name="Relatórios" component={RelatorioScreen} />
        <Tab.Screen name="Configurações" component={ConfiguracoesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// 2. COMPONENTE CÃO DE GUARDA
function AuthGate() {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Fica escutando o Firebase. Mudou de usuário? Ele atualiza a tela na hora.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Enquanto o Firebase decide se tem alguém logado, mostra uma rodinha carregando
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // 3. A BARREIRA: Se não tem usuário, mostra SÓ a tela de login
  if (!user) {
    return <LoginScreen />;
  }

  // Se passou da barreira, libera o app de estoque!
  return <NavigationContent />;
}

export default function App() {
  return (
    <ThemeProvider>
      {/* Colocamos o Cão de Guarda aqui dentro */}
      <AuthGate />
    </ThemeProvider>
  );
}
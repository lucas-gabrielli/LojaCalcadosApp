import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppState, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  '@firebase/firestore: Firestore',
  'BloomFilter error',
  // Vem de dentro do @react-navigation/stack, não do nosso código.
  'InteractionManager has been deprecated',
]);

import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeProvider, ThemeContext } from './ThemeContext';
import FloatingTabBar from './FloatingTabBar';
import { MenuLateralProvider } from './MenuLateral';

import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import ScannerScreen from './ScannerScreen';
import ProdutoScreen from './ProdutoScreen';
import SolicitacoesScreen from './SolicitacoesScreen';
import RelatorioScreen from './RelatorioScreen';
import ConfiguracoesScreen from './ConfiguracoesScreen';
import MetasScreen from './MetasScreen';
import HistoricoScreen from './HistoricoScreen';
import SegurancaScreen from './SegurancaScreen';
import AparenciaScreen from './AparenciaScreen';
import SacolaScreen from './SacolaScreen'; // NOVO IMPORT
import EstoqueBaixoScreen from './EstoqueBaixoScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function InicioStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Scanner" component={ScannerScreen} />
      <Stack.Screen name="Produto" component={ProdutoScreen} />
      <Stack.Screen name="Metas" component={MetasScreen} />
      <Stack.Screen name="Relatorio" component={RelatorioScreen} />
      <Stack.Screen name="Historico" component={HistoricoScreen} />
      <Stack.Screen name="EstoqueBaixo" component={EstoqueBaixoScreen} />
      <Stack.Screen name="Configuracoes" component={ConfiguracoesScreen} />
      <Stack.Screen name="Aparencia" component={AparenciaScreen} />
      <Stack.Screen name="Seguranca" component={SegurancaScreen} />
    </Stack.Navigator>
  );
}

// A Sacola precisa da sua propria pilha: sem ela, abrir o detalhe de um produto
// obrigava a pular para a aba Inicio, o que trocava a aba destacada na barra
// flutuante e fazia o "voltar" cair no Inicio em vez de voltar para a sacola.
function SacolaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Sacola" component={SacolaScreen} />
      <Stack.Screen name="Produto" component={ProdutoScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  const { isDarkMode, isBiometricEnabled } = useContext(ThemeContext);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active' && isBiometricEnabled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Acesso Restrito - Controle de Estoque',
          fallbackLabel: 'Usar senha',
        });
        if (!result.success) console.log("Falha na autenticação");
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isBiometricEnabled]);

  return (
    <MenuLateralProvider>
      <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
        <Tab.Navigator
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <FloatingTabBar {...props} />}
        >
          <Tab.Screen name="Início" component={InicioStack} />
          <Tab.Screen name="Sacola" component={SacolaStack} />
          <Tab.Screen name="Solicitações" component={SolicitacoesScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </MenuLateralProvider>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#5865F2" /></View>;

  return <ThemeProvider>{user ? <MainNavigator /> : <LoginScreen />}</ThemeProvider>;
}
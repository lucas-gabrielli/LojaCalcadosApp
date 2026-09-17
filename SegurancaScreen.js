import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as LocalAuthentication from 'expo-local-authentication';

import { ThemeContext } from './ThemeContext';
import { getSegurancaStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function SegurancaScreen({ navigation }) {
  const { isDarkMode, isBiometricEnabled, toggleBiometry } = useContext(ThemeContext);
  const styles = getSegurancaStyles(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  // Lógica de verificação da biometria
  const handleToggleBiometry = async () => {
    if (!isBiometricEnabled) {
      // Se está tentando LIGAR, verifica o aparelho primeiro
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        showAlert({
          type: 'warning',
          title: 'Indisponível',
          message: 'Seu aparelho não possui biometria cadastrada ou não suporta esta função.',
          actions: [{ label: 'OK' }],
        });
        return;
      }

      // Pede para o usuário provar que é ele mesmo antes de ativar a trava
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua identidade para ativar",
        fallbackLabel: "Usar senha"
      });

      if (result.success) {
        toggleBiometry();
      }
    } else {
      // Se está tentando DESLIGAR, simplesmente desliga
      toggleBiometry();
    }
  };

  return (
    <View style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Segurança</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <Text style={styles.sectionTitle}>Acesso ao Aplicativo</Text>
      
      <View style={styles.card}>
        <View style={styles.optionRow}>
          <View style={styles.optionIconText}>
            <Ionicons name="finger-print" size={24} color={isDarkMode ? '#aaa' : '#555'} style={styles.icon}/>
            <Text style={styles.text}>Bloqueio Biométrico</Text>
          </View>
          <Switch
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isBiometricEnabled ? '#5865F2' : '#f4f3f4'}
            onValueChange={handleToggleBiometry}
            value={isBiometricEnabled}
          />
        </View>
        <Text style={styles.description}>
          Exige sua impressão digital ou reconhecimento facial sempre que o aplicativo for reaberto. Isso protege os dados de estoque caso você deixe o celular desbloqueado no balcão.
        </Text>
      </View>

      <AppAlert {...alert} />
    </View>
  );
}

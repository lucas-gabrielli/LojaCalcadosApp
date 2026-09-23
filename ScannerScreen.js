import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';
import { getScannerStyles, colors } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

const registrarHistorico = async (codigo) => {
  try {
    const raw = await AsyncStorage.getItem('@historico_scan');
    const lista = raw ? JSON.parse(raw) : [];
    const atualizado = [codigo, ...lista.filter((c) => c !== codigo)].slice(0, 20);
    await AsyncStorage.setItem('@historico_scan', JSON.stringify(atualizado));
  } catch (e) {
    console.error('Erro ao salvar histórico:', e);
  }
};

export default function ScannerScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getScannerStyles(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');

  // Pausa a câmera automaticamente ao sair da tela
  useFocusEffect(
    useCallback(() => {
      setIsScanning(false);
    }, [])
  );

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
      </TouchableOpacity>
      <View style={{ width: 24 }} />
    </View>
  );

  if (!permission) {
    return (
      <View style={{ flex: 1 }}>
        <Header />
        <View style={styles.containerCenter}>
          <Text style={styles.textMuted}>Carregando permissões...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1 }}>
        <Header />
        <View style={styles.containerCenter}>
          <Ionicons name="camera-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} style={{ marginBottom: 20 }} />
          <Text style={[styles.title, { textAlign: 'center', marginBottom: 20 }]}>
            Precisamos de acesso à câmera
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnPrimaryText}>Permitir Câmera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 1. Função de Confirmação do Produto
  const handleBarCodeScanned = ({ data }) => {
    setIsScanning(false); // Trava a câmera imediatamente após ler
    const codigoLimpo = String(data).trim();
    // .catch: aparelho sem vibração não pode derrubar a leitura.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    showAlert({
      type: 'info',
      title: 'Código Identificado',
      message: `O scanner leu: ${codigoLimpo}\n\nDeseja ver os detalhes deste calçado?`,
      actions: [
        {
          label: 'Confirmar',
          onPress: () => {
            registrarHistorico(codigoLimpo);
            navigation.navigate('Produto', { qrCode: codigoLimpo });
          }
        },
        {
          label: 'Ler Novamente',
          style: 'cancel',
          onPress: () => setIsScanning(true) // Reativa a câmera para tentar de novo
        },
        {
          label: 'Cancelar Leitura',
          style: 'cancel',
          onPress: () => setIsScanning(false) // Reseta a câmera para o estado inativo
        }
      ],
    });
  };

  const handleBuscaManual = () => {
    if (!codigoManual.trim()) {
      showAlert({ type: 'warning', title: 'Aviso', message: 'Digite o ID do calçado.', actions: [{ label: 'OK' }] });
      return;
    }
    const codigoLimpo = String(codigoManual).trim();
    registrarHistorico(codigoLimpo);
    navigation.navigate('Produto', { qrCode: codigoLimpo });
    setCodigoManual('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Scanner de Estoque</Text>

        {/* CAIXA DA CÂMERA (Com Placeholder de descanso) */}
        <View style={styles.cameraWrapper}>
          {isScanning ? (
            <>
              <CameraView 
                style={styles.camera} 
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "ean13", "ean8", "code128"],
                }}
              />
              <View style={styles.miraVisual} />
            </>
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Ionicons name="videocam-off-outline" size={60} color={isDarkMode ? '#555' : '#aaa'} />
              <Text style={styles.placeholderText}>Câmera inativa</Text>
            </View>
          )}
        </View>

        {/* 2. Função de Ativar o Scanner */}
        {isScanning ? (
          <TouchableOpacity 
            style={[styles.btnPrimary, { backgroundColor: colors(isDarkMode).danger }]}
            onPress={() => setIsScanning(false)}
          >
            <Ionicons name="stop-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>Cancelar Leitura</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={() => setIsScanning(true)}
          >
            <Ionicons name="barcode-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>Iniciar Leitura</Text>
          </TouchableOpacity>
        )}

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.manualContainer}>
          <Text style={styles.label}>Digite o ID do calçado:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: NIKE-SB-42"
            placeholderTextColor={isDarkMode ? '#555' : '#aaa'}
            value={codigoManual}
            onChangeText={setCodigoManual}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={handleBuscaManual}
          />
          <TouchableOpacity 
            style={styles.btnManual} 
            onPress={handleBuscaManual}
          >
            <Text style={styles.btnManualText}>Buscar Manualmente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alert} />
    </KeyboardAvoidingView>
  );
}

import React, { useState, useEffect, useContext } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  Button, 
  TextInput, 
  Alert,
  Platform 
} from 'react-native';

// 1. IMPORTAÇÕES DA CÂMERA
import { CameraView, useCameraPermissions } from 'expo-camera';

import { ThemeContext } from './ThemeContext'; 

export default function ScannerScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getDynamicStyles(isDarkMode);

  // 2. ESTADOS DA CÂMERA
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  
  const [qrCodeDigitado, setQrCodeDigitado] = useState('');

  // 3. REINICIAR SCANNER AO VOLTAR PARA A TELA
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setScanned(false);
    });
    return unsubscribe;
  }, [navigation]);

  // 4. VERIFICAÇÕES DE PERMISSÃO
  if (!permission) {
    // Permissão ainda está carregando
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    // Usuário ainda não deu permissão
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Permissão Necessária</Text>
        <Text style={styles.text}>
          Precisamos acessar a sua câmera para escanear os calçados.
        </Text>
        <Button title="Conceder Permissão" onPress={requestPermission} />
      </View>
    );
  }

  // 5. FUNÇÃO EXECUTADA AO LER O QR CODE
  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true); // Trava a câmera para não ler 10 vezes no mesmo segundo
    
    // Navega automaticamente para a tela de Produto passando o QR Code lido
    navigation.navigate('Produto', { qrCode: data });
  };

  // Função da busca manual (Plano B)
  const handleBuscarProduto = () => {
    if (qrCodeDigitado.trim() === '') {
      Alert.alert('Erro', 'Por favor, digite o código do produto.');
      return;
    }
    navigation.navigate('Produto', { qrCode: qrCodeDigitado });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escanear Produto</Text>
      
      {/* --- CÂMERA --- */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back" // Usa a câmera traseira
          barcodeScannerSettings={{
            barcodeTypes: ["qr"], // Otimiza para procurar apenas QR Codes
          }}
          // Se já escaneou, desativa a leitura temporariamente
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      </View>

      {scanned && (
        <Button 
          title="Escanear Novamente" 
          onPress={() => setScanned(false)} 
        />
      )}

      {/* --- DIVISOR VISUAL --- */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OU</Text>
        <View style={styles.line} />
      </View>
      
      {/* --- BUSCA MANUAL --- */}
      <Text style={styles.text}>
        Digite o ID do produto manualmente:
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ex: TENIS-PRO-AZ-40"
        placeholderTextColor={isDarkMode ? '#888' : '#aaa'} 
        value={qrCodeDigitado}
        onChangeText={setQrCodeDigitado}
        autoCapitalize="none"
      />
      
      <Button 
        title="Buscar Manualmente" 
        onPress={handleBuscarProduto}
        color={Platform.OS === 'ios' && isDarkMode ? '#007aff' : (Platform.OS === 'ios' ? '#007aff' : undefined)}
      />
    </View>
  );
}

const getDynamicStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? '#313338' : '#f5f5f5',
    text: isDarkMode ? '#F2F3F5' : '#000000',
    card: isDarkMode ? '#2B2D31' : '#FFFFFF',
    border: isDarkMode ? '#1E1F22' : '#ccc',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      color: colors.text,
    },
    text: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 10,
      color: colors.text,
    },
    cameraContainer: {
      height: 300,
      width: '100%',
      borderRadius: 15,
      overflow: 'hidden',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.border,
    },
    camera: { flex: 1 },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      width: 50,
      textAlign: 'center',
      color: colors.text,
      fontWeight: 'bold',
    },
    input: {
      height: 50,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      fontSize: 16,
      marginBottom: 20,
      textAlign: 'center',
      backgroundColor: colors.card,
      color: colors.text,
    }
  });
};
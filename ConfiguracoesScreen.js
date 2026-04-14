import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  Pressable 
} from 'react-native';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons'; 

import { ThemeContext } from './ThemeContext'; 
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';

export default function ConfiguracoesScreen() {
  const { isDarkMode, themeMode, setThemeMode } = useContext(ThemeContext);
  const styles = getDynamicStyles(isDarkMode);

  // ESTADO PARA CONTROLAR A JANELA DO MODAL
  const [modalVisible, setModalVisible] = useState(false);

  const usuario = auth.currentUser;

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair do sistema de estoque?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Erro ao sair: ", error);
              Alert.alert('Erro', 'Não foi possível sair da conta.');
            }
          } 
        }
      ]
    );
  };

  // Função para exibir o texto bonito na tela dependendo do que está selecionado
  const getThemeLabel = () => {
    if (themeMode === 'system') return 'Padrão do Sistema';
    if (themeMode === 'dark') return 'Escuro';
    return 'Claro';
  };

  // Função que o Modal usa para salvar a escolha e fechar
  const selecionarTema = (modo) => {
    setThemeMode(modo);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color={isDarkMode ? '#aaa' : '#555'} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Vendedor</Text>
          <Text style={styles.profileEmail}>
            {usuario ? usuario.email : 'Carregando...'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Ajustes de Aparência</Text>

      {/* --- NOVO BOTÃO: MODO DE BRILHO --- */}
      <TouchableOpacity 
        style={styles.optionRow} 
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.optionIconText}>
          <Ionicons name="contrast-outline" size={24} color={isDarkMode ? '#aaa' : '#555'} style={styles.icon}/>
          <Text style={styles.text}>Modo de Brilho</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.themeValue}>{getThemeLabel()}</Text>
          <Ionicons name="chevron-forward" size={20} color={styles.themeValue.color} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" style={styles.icon}/>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

      {/* --- A JANELA SUSPENSA (MODAL) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecione o Modo de Brilho</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={() => selecionarTema('light')}>
              <Text style={[styles.modalOptionText, themeMode === 'light' && styles.modalOptionSelected]}>Claro</Text>
              {themeMode === 'light' && <Ionicons name="checkmark" size={24} color="#5865F2" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => selecionarTema('dark')}>
              <Text style={[styles.modalOptionText, themeMode === 'dark' && styles.modalOptionSelected]}>Escuro</Text>
              {themeMode === 'dark' && <Ionicons name="checkmark" size={24} color="#5865F2" />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => selecionarTema('system')}>
              <Text style={[styles.modalOptionText, themeMode === 'system' && styles.modalOptionSelected]}>Padrão do Sistema</Text>
              {themeMode === 'system' && <Ionicons name="checkmark" size={24} color="#5865F2" />}
            </TouchableOpacity>

            <Pressable style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getDynamicStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? '#313338' : '#f5f5f5',
    text: isDarkMode ? '#F2F3F5' : '#000000',
    textSecondary: isDarkMode ? '#B5BAC1' : '#666666',
    card: isDarkMode ? '#2B2D31' : '#FFFFFF',
    border: isDarkMode ? '#1E1F22' : '#e0e0e0',
    danger: isDarkMode ? '#DA373C' : '#ff4444',
    primary: isDarkMode ? '#5865F2' : '#007bff'
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Constants.statusBarHeight + 20, 
      paddingHorizontal: 20,
    },
    profileSection: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 12,
      marginBottom: 30,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarContainer: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: isDarkMode ? '#1E1F22' : '#eee', 
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    profileInfo: { flex: 1 },
    profileName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: colors.card, 
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionIconText: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: { marginRight: 15 },
    text: {
      fontSize: 18,
      color: colors.text, 
    },
    themeValue: {
      fontSize: 16,
      color: colors.textSecondary,
      marginRight: 5,
    },
    logoutButton: {
      flexDirection: 'row',
      backgroundColor: colors.danger,
      padding: 15,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 'auto',
      marginBottom: 20,
    },
    logoutText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    // --- ESTILOS DO MODAL ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '85%',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    modalOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionText: {
      fontSize: 18,
      color: colors.text,
    },
    modalOptionSelected: {
      fontWeight: 'bold',
      color: colors.primary,
    },
    modalCloseButton: {
      marginTop: 20,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modalCloseText: {
      fontSize: 16,
      color: colors.danger,
      fontWeight: 'bold',
    }
  });
};
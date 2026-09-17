import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from './ThemeContext';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { getConfiguracoesStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function ConfiguracoesScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getConfiguracoesStyles(isDarkMode);
  const usuario = auth.currentUser;
  const { alert, showAlert } = useAppAlert();

  const handleLogout = () => {
    showAlert({
      type: 'danger',
      title: 'Sair da Conta',
      message: 'Tem certeza que deseja sair do sistema?',
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        { label: 'Sair', style: 'destructive', onPress: () => signOut(auth) },
      ],
    });
  };

  const renderMenuItem = (icon, title, route) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate(route)}>
      <View style={styles.menuIconText}>
        <Ionicons name={icon} size={22} color={styles.iconColor.color} style={styles.icon}/>
        <Text style={styles.menuText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#555' : '#ccc'} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color={isDarkMode ? '#aaa' : '#555'} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Vendedor</Text>
          <Text style={styles.profileEmail}>{usuario ? usuario.email : 'Carregando...'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Minha Conta</Text>
      <View style={styles.menuContainer}>
        {renderMenuItem("trending-up-outline", "Desempenho do Mês", "Metas")}
        {renderMenuItem("document-text-outline", "Relatórios", "Relatorio")}
        {renderMenuItem("time-outline", "Histórico de Escaneamento", "Historico")}
      </View>

      <Text style={styles.sectionTitle}>Aplicativo</Text>
      <View style={styles.menuContainer}>
        {renderMenuItem("finger-print-outline", "Segurança", "Seguranca")}
        {renderMenuItem("color-palette-outline", "Aparência", "Aparencia")}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#fff" style={styles.iconLogout}/>
        <Text style={styles.logoutText}>Sair da Conta</Text>
      </TouchableOpacity>

      <AppAlert {...alert} />
    </ScrollView>
  );
}

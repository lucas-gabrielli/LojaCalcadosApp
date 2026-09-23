import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from './ThemeContext';
import { getConfiguracoesStyles } from './styles';

export default function ConfiguracoesScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getConfiguracoesStyles(isDarkMode);

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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Aplicativo</Text>
        <View style={styles.menuContainer}>
          {renderMenuItem("color-palette-outline", "Aparência", "Aparencia")}
          {renderMenuItem("finger-print-outline", "Segurança", "Seguranca")}
        </View>
      </ScrollView>
    </View>
  );
}

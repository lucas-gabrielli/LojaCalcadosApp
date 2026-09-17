import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemeContext } from './ThemeContext';
import { getAparenciaStyles } from './styles';

export default function AparenciaScreen({ navigation }) {
  const { isDarkMode, themeMode, setThemeMode } = useContext(ThemeContext);
  const styles = getAparenciaStyles(isDarkMode);

  const opcoes = [
    { id: 'light', label: 'Claro', icon: 'sunny-outline', desc: 'Ideal para ambientes muito iluminados.' },
    { id: 'dark', label: 'Escuro', icon: 'moon-outline', desc: 'Poupa bateria e descansa a vista à noite.' },
    { id: 'system', label: 'Padrão do Sistema', icon: 'settings-outline', desc: 'Adapta-se automaticamente ao seu telemóvel.' },
  ];

  return (
    <View style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Aparência</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionTitle}>Modo de Brilho</Text>

      <View style={styles.menuContainer}>
        {opcoes.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.menuItem} 
            onPress={() => setThemeMode(item.id)}
          >
            <View style={styles.menuIconText}>
              <View style={[styles.iconCircle, themeMode === item.id && styles.iconCircleActive]}>
                <Ionicons 
                    name={item.icon} 
                    size={20} 
                    color={themeMode === item.id ? '#fff' : (isDarkMode ? '#aaa' : '#555')} 
                />
              </View>
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={[styles.menuText, themeMode === item.id && styles.menuTextActive]}>
                    {item.label}
                </Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
            </View>
            {themeMode === item.id && (
              <Ionicons name="checkmark-circle" size={24} color="#5865F2" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.previewCard}>
        <Ionicons name="information-circle-outline" size={20} color="#5865F2" />
        <Text style={styles.previewText}>
          O modo escuro do "Estoque Loja" foi projetado para reduzir a fadiga ocular durante longas jornadas de trabalho no armazém.
        </Text>
      </View>
    </View>
  );
}

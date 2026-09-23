import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

import { ThemeContext } from './ThemeContext';
import { getHistoricoStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function HistoricoScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getHistoricoStyles(isDarkMode);
  const isFocused = useIsFocused();
  const { alert, showAlert } = useAppAlert();

  const [historico, setHistorico] = useState([]);

  // Recarrega o histórico sempre que a tela ganha foco
  useEffect(() => {
    if (isFocused) {
      carregarHistorico();
    }
  }, [isFocused]);

  const carregarHistorico = async () => {
    try {
      const histRaw = await AsyncStorage.getItem('@historico_scan');
      setHistorico(histRaw ? JSON.parse(histRaw) : []);
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const limparHistorico = () => {
    showAlert({
      type: 'danger',
      title: 'Limpar Histórico',
      message: 'Deseja apagar todos os itens vistos recentemente?',
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        {
          label: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@historico_scan');
            setHistorico([]);
          }
        }
      ],
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => navigation.navigate('Produto', { qrCode: item })}
    >
      <View style={styles.itemContent}>
        <Ionicons name="barcode-outline" size={24} color={isDarkMode ? '#aaa' : '#555'} />
        <Text style={styles.itemText}>{item}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#555' : '#ccc'} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Histórico de Busca</Text>
        {historico.length > 0 ? (
          <TouchableOpacity onPress={limparHistorico}>
            <Ionicons name="trash-outline" size={24} color="#DA373C" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <FlatList
        data={historico}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={80} color={isDarkMode ? '#2B2D31' : '#E5E7EB'} />
            <Text style={styles.emptyText}>Nenhum produto visualizado recentemente.</Text>
          </View>
        }
      />
      <AppAlert {...alert} />
    </View>
  );
}

import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';

import { ThemeContext } from './ThemeContext';
import { getEstoqueBaixoStyles } from './styles';
import { classificarEstoque } from './dominio/estoque';
import { buscarVariacoesComEstoqueBaixo } from './dados/estoqueRepo';

export default function EstoqueBaixoScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getEstoqueBaixoStyles(isDarkMode);
  const isFocused = useIsFocused();

  const [variacoes, setVariacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (estaAtivo) => {
    setLoading(true);
    try {
      const lista = await buscarVariacoesComEstoqueBaixo();
      lista.sort((a, b) => a.estoque - b.estoque);
      if (estaAtivo()) setVariacoes(lista);
    } catch (e) {
      console.error('Erro ao carregar estoque baixo:', e);
    } finally {
      if (estaAtivo()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return undefined;
    let ativo = true;
    carregar(() => ativo);
    return () => { ativo = false; };
  }, [isFocused, carregar]);

  const renderItem = ({ item }) => {
    const situacao = classificarEstoque(item.estoque);
    const isZerado = situacao === 'zerado';
    return (
      <View style={[styles.item, isZerado ? styles.itemZerado : styles.itemBaixo]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemNome} numberOfLines={1}>{item.nomeProduto}</Text>
          <Text style={styles.itemDetalhes}>Tam: {item.tamanho} {item.cor ? `• ${item.cor}` : ''}</Text>
        </View>
        <View style={[styles.badge, isZerado ? styles.badgeZerado : styles.badgeBaixo]}>
          <Text style={[styles.badgeText, isZerado ? styles.badgeTextZerado : styles.badgeTextBaixo]}>
            {isZerado ? 'Zerado' : `${item.estoque} un.`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Estoque Baixo</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>Produtos da loja que precisam de reposição.</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#5865F2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={variacoes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={70} color={isDarkMode ? '#444' : '#ccc'} />
              <Text style={styles.emptyText}>Nenhum produto com estoque baixo no momento.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

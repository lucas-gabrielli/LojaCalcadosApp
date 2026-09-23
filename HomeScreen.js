import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';

import { ThemeContext } from './ThemeContext';
import { auth, db } from './firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getHomeStyles } from './styles';
import { useMenuLateral, MenuLateralOverlay } from './MenuLateral';

const formatarNomeDoEmail = (email) => {
  const prefixo = email.split('@')[0].split(/[._0-9]/)[0];
  if (!prefixo) return 'Vendedor';
  return prefixo.charAt(0).toUpperCase() + prefixo.slice(1);
};

const ATALHOS = [
  { icon: 'bag-handle-outline', label: 'Sacola', target: (nav) => nav.navigate('Sacola') },
  { icon: 'receipt-outline', label: 'Solicitações', target: (nav) => nav.navigate('Solicitações') },
  { icon: 'document-text-outline', label: 'Relatórios', target: (nav) => nav.navigate('Relatorio') },
  { icon: 'time-outline', label: 'Histórico', target: (nav) => nav.navigate('Historico') },
  { icon: 'trending-up-outline', label: 'Metas', target: (nav) => nav.navigate('Metas') },
  { icon: 'settings-outline', label: 'Configurações', target: (nav) => nav.navigate('Configuracoes') },
];

export default function HomeScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getHomeStyles(isDarkMode);
  const isFocused = useIsFocused();
  const usuario = auth.currentUser;

  const [pendentes, setPendentes] = useState(0);
  const [vendasHoje, setVendasHoje] = useState(0);
  const { abrirPeloAvatar, aoFocarInicio } = useMenuLateral();

  // Quem entrou numa tela PELO MENU volta com o menu já aberto. Quem entrou
  // por um atalho da grade, não. A decisão é de dominio/menuLateral.js.
  useFocusEffect(
    useCallback(() => {
      aoFocarInicio();
    }, [aoFocarInicio])
  );

  const nomeExibicao = usuario?.email ? formatarNomeDoEmail(usuario.email) : 'Vendedor';

  useEffect(() => {
    if (!isFocused || !usuario) return;

    const carregarResumo = async () => {
      try {
        const inicioDoDia = new Date();
        inicioDoDia.setHours(0, 0, 0, 0);

        const qPendentes = query(
          collection(db, 'solicitacoes'),
          where('usuario_email', '==', usuario.email),
          where('status', '==', 'pendente')
        );
        const qVendasHoje = query(
          collection(db, 'solicitacoes'),
          where('usuario_email', '==', usuario.email),
          where('status', '==', 'vendida'),
          where('dataVenda', '>=', Timestamp.fromDate(inicioDoDia))
        );

        const [snapPendentes, snapVendasHoje] = await Promise.all([getDocs(qPendentes), getDocs(qVendasHoje)]);
        setPendentes(snapPendentes.size);
        setVendasHoje(snapVendasHoje.size);
      } catch (e) {
        console.error('Erro ao carregar resumo do início:', e);
      }
    };

    carregarResumo();
  }, [isFocused, usuario]);

  return (
    // O menu é irmão do ScrollView (nunca filho dele): assim a camada absoluta
    // se posiciona contra a tela, e não contra o conteúdo rolável.
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Olá, {nomeExibicao} 👋</Text>
          <Text style={styles.greetingSubtitle}>Pronto para atender?</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={abrirPeloAvatar} accessibilityLabel="Abrir menu">
          <Ionicons name="person-outline" size={22} color={isDarkMode ? '#aaa' : '#555'} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('Scanner')} activeOpacity={0.85}>
        <View style={styles.heroIconWrapper}>
          <Ionicons name="barcode-outline" size={32} color="#fff" />
        </View>
        <View style={styles.heroTextWrapper}>
          <Text style={styles.heroTitle}>Escanear Produto</Text>
          <Text style={styles.heroSubtitle}>Consulte o estoque na hora</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statTile} onPress={() => navigation.navigate('Solicitações')}>
          <Text style={styles.statTileValue}>{pendentes}</Text>
          <Text style={styles.statTileLabel}>Solicitações pendentes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statTile} onPress={() => navigation.navigate('Metas')}>
          <Text style={styles.statTileValue}>{vendasHoje}</Text>
          <Text style={styles.statTileLabel}>Vendas hoje</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Acesso Rápido</Text>
      <View style={styles.grid}>
        {ATALHOS.map((atalho) => (
          <TouchableOpacity key={atalho.label} style={styles.gridItem} onPress={() => atalho.target(navigation)}>
            <View style={styles.gridIconWrapper}>
              <Ionicons name={atalho.icon} size={20} color={isDarkMode ? '#F2F3F5' : '#5865F2'} />
            </View>
            <Text style={styles.gridLabel}>{atalho.label}</Text>
          </TouchableOpacity>
        ))}
        </View>
      </ScrollView>

      <MenuLateralOverlay navegar={(rota) => navigation.navigate(rota)} />
    </View>
  );
}

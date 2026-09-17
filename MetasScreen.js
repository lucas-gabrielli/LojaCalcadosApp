import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';

import { ThemeContext } from './ThemeContext';
import { auth, db } from './firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getMetasStyles } from './styles';

export default function MetasScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getMetasStyles(isDarkMode);
  const isFocused = useIsFocused();

  const [vendasMes, setVendasMes] = useState(0);
  const [tempoMedioMinutos, setTempoMedioMinutos] = useState(null);
  const [loading, setLoading] = useState(true);

  const usuario = auth.currentUser;
  const META_MENSAL = 50;

  useEffect(() => {
    if (isFocused) {
      carregarMetas();
    }
  }, [isFocused]);

  const carregarMetas = async () => {
    setLoading(true);
    try {
      if (usuario) {
        const inicioDoMes = new Date();
        inicioDoMes.setDate(1);
        inicioDoMes.setHours(0,0,0,0);

        const q = query(
          collection(db, 'solicitacoes'),
          where('usuario_email', '==', usuario.email),
          where('status', '==', 'vendida'),
          where('dataVenda', '>=', Timestamp.fromDate(inicioDoMes))
        );

        const snap = await getDocs(q);
        setVendasMes(snap.size);

        let somaMinutos = 0;
        let contagemValida = 0;
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.dataSolicitacao && data.dataVenda) {
            const minutos = (data.dataVenda.seconds - data.dataSolicitacao.seconds) / 60;
            if (minutos >= 0) {
              somaMinutos += minutos;
              contagemValida++;
            }
          }
        });
        setTempoMedioMinutos(contagemValida > 0 ? somaMinutos / contagemValida : null);
      }
    } catch (e) {
      console.error("Erro ao carregar metas:", e);
    } finally {
      setLoading(false);
    }
  };

  const percentualMeta = Math.min((vendasMes / META_MENSAL) * 100, 100);

  const formatarTempoMedio = (minutos) => {
    if (minutos == null) return '—';
    if (minutos < 60) return `${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    const resto = Math.round(minutos % 60);
    return `${horas}h${resto > 0 ? ` ${resto}min` : ''}`;
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
        </TouchableOpacity>
        <Text style={styles.title}>Desempenho do Mês</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Acompanhe o seu progresso de vendas neste mês.</Text>

      <View style={styles.goalCard}>
        {loading ? (
            <ActivityIndicator size="large" color="#5865F2" style={{ marginVertical: 20 }}/>
        ) : (
            <View>
                <View style={styles.goalHeader}>
                    <Text style={styles.goalText}>Meta de Vendas</Text>
                    <Text style={styles.goalCount}>{vendasMes} / {META_MENSAL}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percentualMeta}%` }]} />
                </View>
                <Text style={styles.goalSubtext}>
                    {percentualMeta >= 100 ? "🎉 Parabéns! Meta atingida!" : `Faltam ${META_MENSAL - vendasMes} pares para bater a meta.`}
                </Text>
            </View>
        )}
      </View>

      {!loading && (
        <View style={styles.tempoCard}>
          <View style={styles.tempoCardIconWrapper}>
            <Ionicons name="time-outline" size={22} color={styles.tempoCardIcon.color} />
          </View>
          <View style={styles.tempoCardTextWrapper}>
            <Text style={styles.tempoCardLabel}>Tempo médio de atendimento</Text>
            <Text style={styles.tempoCardValue}>{formatarTempoMedio(tempoMedioMinutos)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, Animated, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemeContext } from './ThemeContext';
import { getSideMenuStyles, colors } from './styles';

const TEMPO_ABRIR = 220;
const TEMPO_FECHAR = 180;

/**
 * Menu lateral em Modal.
 *
 * Histórico, para não repetir os erros já cometidos aqui:
 * - O Modal chegou a ser removido por suspeita de causar a tela preta. Não
 *   causava: a culpada era a stack nativa (react-native-screens). Sem Modal, a
 *   camada renderizava e o Android não a desenhava.
 * - O fundo escuro é estático. Animar a opacidade dele nunca renderizou.
 * - O fundo só aceita toque depois de abrir, senão o mesmo toque que abriu o
 *   menu era reentregue a ele e fechava na hora.
 *
 * `instantaneo` pula a animação e o atraso do fundo: usado na ida-e-volta por um
 * item do menu, onde animar faria o menu parecer que fechou e abriu de novo.
 *
 * sections: [{ title, items: [{ icon, label, onPress }] }]
 */
export default function SideMenu({ visible, instantaneo, onClose, nome, email, sections, onLogout }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getSideMenuStyles(isDarkMode);
  const c = colors(isDarkMode);
  const { width } = useWindowDimensions();
  const larguraPainel = Math.min(width * 0.82, 340);

  // `montado` segura o Modal na tela durante a animação de saída.
  const [montado, setMontado] = useState(visible);
  const progresso = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setMontado(true);
      // Já nasce no lugar: nada de painel deslizando na volta de uma tela.
      if (instantaneo) {
        progresso.setValue(1);
        return undefined;
      }
      Animated.timing(progresso, {
        toValue: 1,
        duration: TEMPO_ABRIR,
        useNativeDriver: true,
      }).start();
      return undefined;
    }

    if (instantaneo) {
      progresso.setValue(0);
      setMontado(false);
      return undefined;
    }

    Animated.timing(progresso, {
      toValue: 0,
      duration: TEMPO_FECHAR,
      useNativeDriver: true,
    }).start();

    // O desmonte NÃO pode depender do callback `finished`: quando a animação é
    // interrompida (navegar para outra tela no meio do fechamento) ele nunca
    // chega, e o Modal ficava montado com o fundo escuro por cima de tudo, sem
    // painel e sem toque que o fechasse — a tela travava de vez.
    const id = setTimeout(() => setMontado(false), TEMPO_FECHAR);
    return () => clearTimeout(id);
  }, [visible, instantaneo]);

  const [fundoAtivo, setFundoAtivo] = useState(false);
  useEffect(() => {
    if (!visible) {
      setFundoAtivo(false);
      return undefined;
    }
    // A espera existe só para o toque que abriu o menu não ser reentregue ao
    // fundo. Na reabertura instantânea não houve toque nenhum nesta tela, e
    // esperar deixaria o menu surdo por um quarto de segundo — exatamente a
    // sensação de tela travada.
    if (instantaneo) {
      setFundoAtivo(true);
      return undefined;
    }
    const id = setTimeout(() => setFundoAtivo(true), TEMPO_ABRIR + 30);
    return () => clearTimeout(id);
  }, [visible, instantaneo]);

  const translateX = progresso.interpolate({ inputRange: [0, 1], outputRange: [larguraPainel, 0] });

  return (
    <Modal visible={montado} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={fundoAtivo ? onClose : undefined}
        // Sem isto o fundo engole o toque mesmo quando não tem o que fazer com
        // ele, e a tela parece travada durante a animação.
        pointerEvents={fundoAtivo ? 'auto' : 'none'}
        accessibilityLabel="Fechar menu"
      />

      <Animated.View style={[styles.panel, { width: larguraPainel, transform: [{ translateX }] }]}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Fechar menu">
          <Ionicons name="close" size={26} color={c.text} />
        </TouchableOpacity>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={c.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{nome}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {sections.map((secao) => (
            <View key={secao.title}>
              <Text style={styles.sectionTitle}>{secao.title}</Text>
              <View style={styles.sectionContainer}>
                {secao.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.item, index === secao.items.length - 1 && styles.itemLast]}
                    onPress={item.onPress}
                  >
                    <Ionicons name={item.icon} size={22} color={c.textMuted} style={styles.itemIcon} />
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={isDarkMode ? '#555' : '#ccc'} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

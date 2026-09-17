import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { ThemeContext } from './ThemeContext';
import { getFloatingTabBarStyles, colors } from './styles';

const ICONS_BY_ROUTE = {
  'Início': ['home-outline', 'home'],
  Sacola: ['bag-handle-outline', 'bag-handle'],
  'Solicitações': ['receipt-outline', 'receipt'],
  'Configurações': ['settings-outline', 'settings'],
};

// Sub-telas que já têm seu próprio cabeçalho com "voltar" — a barra flutuante
// só faz sentido nas telas-raiz de cada aba, onde o vendedor precisa trocar rápido.
const HIDDEN_ON_NESTED_ROUTES = ['Scanner', 'Produto', 'Metas', 'Historico', 'Seguranca', 'Aparencia', 'Relatorio'];

export default function FloatingTabBar({ state, descriptors, navigation, insets }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getFloatingTabBarStyles(isDarkMode);
  const c = colors(isDarkMode);

  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (barWidth > 0) {
      const tabWidth = barWidth / state.routes.length;
      Animated.spring(translateX, {
        toValue: tabWidth * state.index,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
    }
  }, [state.index, barWidth]);

  const focusedRoute = state.routes[state.index];
  const nestedRouteName = getFocusedRouteNameFromRoute(focusedRoute);
  if (HIDDEN_ON_NESTED_ROUTES.includes(nestedRouteName)) return null;

  const tabWidth = barWidth / state.routes.length;

  return (
    <View style={[styles.wrapper, { bottom: (insets?.bottom || 0) + 16 }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {barWidth > 0 && (
          <Animated.View
            style={[styles.indicator, { width: tabWidth - 12, transform: [{ translateX }] }]}
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const [outlineIcon, filledIcon] = ICONS_BY_ROUTE[route.name] || ['ellipse-outline', 'ellipse'];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || route.name}
              onPress={onPress}
              style={styles.tabButton}
            >
              <Ionicons name={isFocused ? filledIcon : outlineIcon} size={22} color={isFocused ? c.primary : c.textMuted} />
              <Text style={[styles.tabLabel, { color: isFocused ? c.primary : c.textMuted }]} numberOfLines={1}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

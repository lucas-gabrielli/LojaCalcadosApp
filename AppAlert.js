import React, { useContext, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemeContext } from './ThemeContext';
import { getAppAlertStyles, colors } from './styles';

const ICON_BY_TYPE = {
  danger: 'close-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  info: 'information-circle',
};

// Hook auxiliar: showAlert(...) tem a mesma cara do Alert.alert(title, message, buttons),
// só que abre o modal customizado <AppAlert {...alert} /> em vez do diálogo nativo do SO.
export function useAppAlert() {
  const [alertState, setAlertState] = useState({ visible: false });

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(({ type = 'info', title, message, actions = [{ label: 'OK' }] }) => {
    setAlertState({ visible: true, type, title, message, actions });
  }, []);

  return { alert: { ...alertState, onRequestClose: hideAlert }, showAlert, hideAlert };
}

export default function AppAlert({ visible, type = 'info', title, message, actions = [{ label: 'OK' }], onRequestClose }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getAppAlertStyles(isDarkMode);
  const c = colors(isDarkMode);

  const accentColor = { danger: c.danger, success: c.success, warning: c.warning, info: c.primary }[type] || c.primary;
  const accentBg = { danger: c.dangerBg, success: c.successBg, warning: c.warningBg, info: c.primaryLight }[type] || c.primaryLight;

  const handlePress = (action) => {
    if (onRequestClose) onRequestClose();
    if (action.onPress) action.onPress();
  };

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: accentBg }]}>
            <Ionicons name={ICON_BY_TYPE[type] || ICON_BY_TYPE.info} size={32} color={accentColor} />
          </View>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={[styles.actionsRow, actions.length > 2 && styles.actionsColumn]}>
            {actions.map((action, index) => {
              const isCancel = action.style === 'cancel';
              const isDestructive = action.style === 'destructive';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.actionBtn,
                    isCancel ? styles.actionBtnCancel : { backgroundColor: isDestructive ? c.danger : accentColor },
                  ]}
                  onPress={() => handlePress(action)}
                >
                  <Text style={[styles.actionText, isCancel && styles.actionTextCancel]}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

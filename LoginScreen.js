import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

// Importa a autenticação do seu arquivo de configuração
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

import { ThemeContext } from './ThemeContext';
import { getLoginStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function LoginScreen() {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getLoginStyles(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      showAlert({ type: 'warning', title: 'Erro', message: 'Por favor, preencha todos os campos.', actions: [{ label: 'OK' }] });
      return;
    }

    setLoading(true);
    try {
      // Tenta logar no Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Se der certo, não precisamos fazer um "navigation.navigate" aqui.
      // O App.js vai perceber a mudança de estado e trocar a tela sozinho!
    } catch (error) {
      console.error(error);
      showAlert({ type: 'danger', title: 'Erro de Login', message: 'E-mail ou senha incorretos.', actions: [{ label: 'OK' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Acesso ao Estoque</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
      <AppAlert {...alert} />
    </KeyboardAvoidingView>
  );
}

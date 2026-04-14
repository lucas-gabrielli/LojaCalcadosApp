import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';

// Importa a autenticação do seu arquivo de configuração
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

import { ThemeContext } from './ThemeContext';

export default function LoginScreen() {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getDynamicStyles(isDarkMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
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
      Alert.alert('Erro de Login', 'E-mail ou senha incorretos.');
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
    </KeyboardAvoidingView>
  );
}

const getDynamicStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? '#313338' : '#f5f5f5',
    card: isDarkMode ? '#2B2D31' : '#FFFFFF',
    text: isDarkMode ? '#F2F3F5' : '#000000',
    border: isDarkMode ? '#1E1F22' : '#ccc',
    primary: isDarkMode ? '#5865F2' : '#007bff'
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      padding: 20,
    },
    formContainer: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0 : 0.1, // Sombra apenas no modo claro
      shadowRadius: 4,
      elevation: isDarkMode ? 0 : 3,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      height: 50,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 15,
      marginBottom: 15,
      color: colors.text,
      fontSize: 16,
    },
    button: {
      backgroundColor: colors.primary,
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    }
  });
};
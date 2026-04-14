import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 1. Mudamos as importações do Auth
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDfhWZgjc3pXjggOU4PKIAGiWtr47rJKzU",
  authDomain: "estoquelojacalcados.firebaseapp.com",
  projectId: "estoquelojacalcados",
  storageBucket: "estoquelojacalcados.firebasestorage.app",
  messagingSenderId: "456154910731",
  appId: "1:456154910731:web:73cd5cd74ce14e30beb70e"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// 2. Inicializamos o Auth usando o AsyncStorage para salvar a sessão
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
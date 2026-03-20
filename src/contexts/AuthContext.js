import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, db } from "../config/firebaseConfig";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function carregarPerfil(uid) {
    try {
      const snapshot = await get(ref(db, `users/${uid}`));

      if (snapshot.exists()) {
        setProfile(snapshot.val());
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      setProfile(null);
    }
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioLogado) => {
      setUser(usuarioLogado);

      if (usuarioLogado) {
        await carregarPerfil(usuarioLogado.uid);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
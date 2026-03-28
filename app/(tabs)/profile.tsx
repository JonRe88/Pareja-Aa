import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LogOut, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMetrics();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conflict_sessions')
        .select('*')
        .eq('status', 'completed')
        .eq('user_id', user?.user_id);

      if (!error && data) {
        setMetrics({
          total_sessions: data.length,
          completed_sessions: data.length,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7EC8A0" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginContent}>
          <UserIcon size={64} color="rgba(126,200,160,0.4)" />
          <Text style={styles.loginTitle}>Inicia sesión</Text>
          <Text style={styles.loginDesc}>
            Inicia sesión para acceder a tu perfil, historial y métricas personales.
          </Text>
          <TouchableOpacity style={styles.loginBtn} onPress={login}>
            <UserIcon size={18} color="#fff" />
            <Text style={styles.loginBtnText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{metrics?.total_sessions || 0}</Text>
            <Text style={styles.statLabel}>Sesiones</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{metrics?.completed_sessions || 0}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={20} color="#E57373" />
          <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PauseUs v1.0</Text>
          <Text style={styles.footerSubtext}>Un espacio para desacelerar</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E0C',
  },
  scroll: {
    padding: 20,
    paddingTop: 80,
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0E0C',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 16,
  },
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0E0C',
    padding: 40,
  },
  loginContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  loginTitle: {
    fontSize: 28,
    fontFamily: 'Parisienne_400Regular',
    color: '#F0EDE8',
    marginTop: 24,
    marginBottom: 12,
  },
  loginDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7EC8A0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#0A0E0C',
    fontSize: 32,
    fontWeight: '600',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Parisienne_400Regular',
    color: '#F0EDE8',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 32,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(94,139,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.2)',
    borderRadius: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '300',
    color: '#7EC8A0',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(229,115,115,0.3)',
    borderRadius: 100,
  },
  logoutBtnText: {
    color: '#E57373',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: 60,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 10,
    color: 'rgba(126,200,160,0.4)',
    letterSpacing: 1,
  },
});

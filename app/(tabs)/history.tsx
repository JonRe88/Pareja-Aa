import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('conflict_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(100);

      if (user) {
        query = query.eq('user_id', user.user_id);
      }

      const { data, error } = await query;

      if (!error && data) {
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7EC8A0" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#7EC8A0"
        />
      }
    >
      <Text style={styles.title}>Historial de Reflexiones</Text>
      {user && <Text style={styles.subtitle}>Mostrando tu historial personal</Text>}

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aún no hay sesiones completadas</Text>
          {!user && <Text style={styles.emptyHint}>Inicia sesión para ver tu historial personal</Text>}
        </View>
      ) : (
        history.map((session, i) => (
          <View key={i} style={styles.historyCard}>
            <View style={styles.historyCardHeader}>
              <Text style={styles.historyCode}>#{session.code}</Text>
              <Text style={styles.historyDate}>
                {new Date(session.completed_at).toLocaleDateString('es-ES')}
              </Text>
            </View>
            <View style={styles.historyTags}>
              {session.ai_analysis?.shared_emotions?.slice(0, 3).map((emotion: string, j: number) => (
                <View key={j} style={styles.historyTag}>
                  <Text style={styles.historyTagText}>{emotion}</Text>
                </View>
              ))}
            </View>
            {session.pattern_tags?.length > 0 && (
              <View style={styles.patternTags}>
                {session.pattern_tags.slice(0, 3).map((tag: string, j: number) => (
                  <View key={j} style={styles.patternTag}>
                    <Text style={styles.patternTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
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
  title: {
    fontSize: 28,
    fontFamily: 'Parisienne_400Regular',
    color: '#F0EDE8',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(126,200,160,0.6)',
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 12,
    color: 'rgba(126,200,160,0.5)',
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7EC8A0',
  },
  historyDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  historyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  historyTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(94,139,110,0.15)',
  },
  historyTagText: {
    fontSize: 11,
    color: '#A8D8BB',
  },
  patternTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  patternTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(196,156,80,0.15)',
  },
  patternTagText: {
    fontSize: 11,
    color: '#C49C50',
  },
});

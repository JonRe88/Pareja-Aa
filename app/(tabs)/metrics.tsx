import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ChartBar as BarChart3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function MetricsScreen() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, [user]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('conflict_sessions')
        .select('*')
        .eq('status', 'completed');

      if (user) {
        query = query.eq('user_id', user.user_id);
      }

      const { data, error } = await query;

      if (!error && data) {
        const emotionCounts: Record<string, number> = {};
        const patternCounts: Record<string, number> = {};

        data.forEach((session: any) => {
          session.ai_analysis?.shared_emotions?.forEach((emotion: string) => {
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
          });
          session.pattern_tags?.forEach((tag: string) => {
            patternCounts[tag] = (patternCounts[tag] || 0) + 1;
          });
        });

        setMetrics({
          total_sessions: data.length,
          completed_sessions: data.length,
          common_emotions: Object.entries(emotionCounts)
            .map(([emotion, count]) => ({ emotion, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          common_patterns: Object.entries(patternCounts)
            .map(([pattern, count]) => ({ pattern, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7EC8A0" />
        <Text style={styles.loadingText}>Cargando métricas...</Text>
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
      <Text style={styles.title}>Métricas y Patrones</Text>
      {user && <Text style={styles.subtitle}>Tus estadísticas personales</Text>}

      {metrics ? (
        <>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{metrics.total_sessions}</Text>
              <Text style={styles.metricLabel}>Sesiones totales</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricNumber}>{metrics.completed_sessions}</Text>
              <Text style={styles.metricLabel}>Completadas</Text>
            </View>
          </View>

          {metrics.common_emotions?.length > 0 && (
            <View style={styles.metricsSection}>
              <Text style={styles.metricsSectionTitle}>Emociones más frecuentes</Text>
              {metrics.common_emotions.slice(0, 5).map((item: any, i: number) => (
                <View key={i} style={styles.metricsItem}>
                  <Text style={styles.metricsItemText}>{item.emotion}</Text>
                  <View style={styles.metricsBar}>
                    <View style={[styles.metricsBarFill, { width: `${Math.min(100, item.count * 20)}%` }]} />
                  </View>
                  <Text style={styles.metricsCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          )}

          {metrics.common_patterns?.length > 0 && (
            <View style={styles.metricsSection}>
              <Text style={styles.metricsSectionTitle}>Patrones frecuentes</Text>
              <View style={styles.patternCloud}>
                {metrics.common_patterns.map((item: any, i: number) => (
                  <View key={i} style={styles.patternCloudTag}>
                    <Text style={styles.patternCloudText}>{item.pattern} ({item.count})</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <BarChart3 size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>No hay datos suficientes</Text>
        </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(94,139,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.2)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 36,
    fontWeight: '300',
    color: '#7EC8A0',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    textAlign: 'center',
  },
  metricsSection: {
    marginBottom: 24,
  },
  metricsSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F0EDE8',
    marginBottom: 16,
  },
  metricsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  metricsItemText: {
    width: 100,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  metricsBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricsBarFill: {
    height: '100%',
    backgroundColor: '#7EC8A0',
    borderRadius: 4,
  },
  metricsCount: {
    width: 30,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
  patternCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  patternCloudTag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(196,156,80,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196,156,80,0.25)',
  },
  patternCloudText: {
    fontSize: 12,
    color: '#C49C50',
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
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User as LucideUser, Key, Camera, Check, Copy, Share as ShareIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const TOTAL_SECONDS = 120;

const emotions = [
  { emoji: '😤', label: 'Frustrado o enojado' },
  { emoji: '😔', label: 'Triste o decaído' },
  { emoji: '😰', label: 'Ansioso o preocupado' },
  { emoji: '😶', label: 'Sin emociones o neutral' },
  { emoji: '😠', label: 'Enojado o irritado' },
  { emoji: '😢', label: 'Triste o deprimido' },
  { emoji: '😕', label: 'Confundido' },
  { emoji: '😮‍💨', label: 'Agotado' },
];

const inputSteps = [
  { key: 'happened', label: '¿Qué pasó?', hint: 'Describe la situación brevemente (máx 300 caracteres)', type: 'textarea' },
  { key: 'emotion', label: '¿Cómo te sientes?', hint: 'Elige lo que más resuena contigo', type: 'emotions' },
  { key: 'need', label: '¿Qué necesitas?', hint: '¿Qué te ayudaría a sentirte entendido/a?', type: 'textarea' },
  { key: 'outcome', label: '¿Qué resultado te ayudaría?', hint: 'Un paso pequeño y realista hacia adelante', type: 'textarea' },
];

type Screen = 'home' | 'join' | 'timer' | 'input' | 'waiting' | 'result';

interface Answers {
  happened: string;
  emotion: number | null;
  need: string;
  outcome: string;
}

interface AIAnalysis {
  shared_emotions: string[];
  coincidences: string[];
  key_misunderstandings: string;
  real_needs_behind_anger: string;
  micro_agreements: string[];
  summary: string;
}

interface Session {
  id: string;
  code: string;
  status: string;
  ai_analysis?: AIAnalysis;
  person_a_data: { completed: boolean };
  person_b_data: { completed: boolean };
}

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('home');
  const [inputStep, setInputStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ happened: '', emotion: null, need: '', outcome: '' });
  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const [timerDone, setTimerDone] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [currentPerson, setCurrentPerson] = useState<'a' | 'b'>('a');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState<Session | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [screen]);

  useEffect(() => {
    if (screen === 'timer') {
      setSeconds(TOTAL_SECONDS);
      setTimerDone(false);
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setTimerDone(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [screen]);

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    if (screen === 'waiting' && sessionCode) {
      pollInterval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('conflict_sessions')
            .select('*')
            .eq('code', sessionCode)
            .maybeSingle();

          const bothCompleted =
            !!data?.person_a_data?.completed &&
            !!data?.person_b_data?.completed;

          const hasAnalysis =
            !!data?.ai_analysis && Object.keys(data.ai_analysis).length > 0;

          if (data && (data.status === 'completed' || (bothCompleted && hasAnalysis))) {
            setSessionData(data);
            setScreen('result');
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [screen, sessionCode]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  const currentStep = inputSteps[inputStep];
  const canNext = currentStep
    ? currentStep.type === 'emotions'
      ? answers.emotion !== null
      : (answers[currentStep.key as keyof Answers] ?? '').toString().trim().length > 0
    : false;

  const createSession = async () => {
    setLoading(true);
    setError('');
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const { error } = await supabase
        .from('conflict_sessions')
        .insert([{
          code,
          user_id: user?.user_id || null,
          status: 'waiting_for_both',
          person_a_data: { completed: false, started_at: new Date().toISOString() },
          person_b_data: { completed: false }
        }])
        .select()
        .single();

      if (error) throw error;

      setSessionCode(code);
      setCurrentPerson('a');
      setScreen('timer');
    } catch (e: any) {
      setError('Error al crear la sesión: ' + e.message);
    }
    setLoading(false);
  };

  const joinSession = async () => {
    if (joinCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('conflict_sessions')
        .select('*')
        .eq('code', joinCode)
        .maybeSingle();

      if (error || !data) {
        setError('Código no encontrado');
        setLoading(false);
        return;
      }

      if (data.status === 'completed') {
        setError('Esta sesión ya fue completada');
        setLoading(false);
        return;
      }

      // El creador siempre es A; quien se une siempre es B.
      if (data.person_b_data?.started_at) {
        setError('Esta sesión ya tiene a tu pareja conectada');
        setLoading(false);
        return;
      }

      const { error: reserveError } = await supabase
        .from('conflict_sessions')
        .update({
          person_b_data: { ...(data.person_b_data ?? {}), completed: false, started_at: new Date().toISOString() }
        })
        .eq('code', joinCode);

      if (reserveError) throw reserveError;

      setSessionCode(joinCode);
      setCurrentPerson('b');
      setScreen('timer');
    } catch (e: any) {
      setError('Error de conexión: ' + e.message);
    }
    setLoading(false);
  };

  const submitResponses = async () => {
    setLoading(true);
    setError('');
    try {
      const personData = {
        happened: answers.happened,
        emotion: answers.emotion,
        emotion_label: emotions[answers.emotion!]?.label || '',
        need: answers.need,
        outcome: answers.outcome,
        completed: true,
        submitted_at: new Date().toISOString()
      };

      const personKey = currentPerson === 'a' ? 'person_a_data' : 'person_b_data';

      const { data: currentSession } = await supabase
        .from('conflict_sessions')
        .select('*')
        .eq('code', sessionCode)
        .maybeSingle();

      if (!currentSession) throw new Error('Sesión no encontrada');

      await supabase
        .from('conflict_sessions')
        .update({ [personKey]: personData })
        .eq('code', sessionCode);

      const { data: updatedSession } = await supabase
        .from('conflict_sessions')
        .select('*')
        .eq('code', sessionCode)
        .maybeSingle();

      const bothCompleted =
        updatedSession?.person_a_data?.completed &&
        updatedSession?.person_b_data?.completed;

      if (bothCompleted) {
        const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-conflict`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            code: sessionCode,
            person_a: updatedSession.person_a_data,
            person_b: updatedSession.person_b_data
          })
        });

        if (response.ok) {
          const { data: finalSession } = await supabase
            .from('conflict_sessions')
            .select('*')
            .eq('code', sessionCode)
            .maybeSingle();

          if (finalSession) {
            setSessionData(finalSession);
            setScreen('result');
          }
        } else {
          throw new Error('Error al analizar el conflicto');
        }
      } else {
        setScreen('waiting');
      }
    } catch (e: any) {
      setError('Error al enviar respuestas: ' + e.message);
    }
    setLoading(false);
  };

  const shareCode = async () => {
    const message = `¡Te invito a resolver nuestro conflicto juntos en PauseUs!

Código: ${sessionCode}

O usa este link: https://pauseus.app?code=${sessionCode}`;
    try {
      await Share.share({ message });
    } catch (e) {
      console.error(e);
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(sessionCode);
  };

  const resetApp = () => {
    setScreen('home');
    setInputStep(0);
    setAnswers({ happened: '', emotion: null, need: '', outcome: '' });
    setSessionCode('');
    setJoinCode('');
    setSessionData(null);
    setError('');
  };

  if (screen === 'home') {
    return (
      <Animated.View style={[styles.homeContainer, { opacity: fadeAnim }]}>
        <View style={styles.homeGlow} />

        <TouchableOpacity
          style={styles.userIndicator}
          onPress={() => user ? router.push('/(tabs)/profile') : login()}
        >
          {user ? (
            <>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.userNameSmall}>{user.name.split(' ')[0]}</Text>
            </>
          ) : (
            <>
              <LucideUser size={28} color="rgba(126,200,160,0.6)" />
              <Text style={styles.loginHint}>Iniciar sesión</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.homeLabel}>Un espacio para desacelerar</Text>
        <Text style={styles.homeTitle}>Press{'\n'}<Text style={styles.homeTitleItalic}>Pause.</Text></Text>
        <Text style={styles.homeDesc}>
          Antes de reaccionar — toma dos minutos para sentir, reflexionar y encontrar claridad juntos.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={createSession} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#F0EDE8" />
          ) : (
            <>
              <View style={styles.btnIcon}>
                <View style={styles.btnBar} />
                <View style={styles.btnBar} />
              </View>
              <Text style={styles.primaryBtnText}>Iniciar Mediación</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('join')}>
          <Key size={20} color="#7EC8A0" />
          <Text style={styles.secondaryBtnText}>Unirme con código</Text>
        </TouchableOpacity>

        {!user && (
          <TouchableOpacity style={styles.googleBtn} onPress={login}>
            <LucideUser size={18} color="#fff" />
            <Text style={styles.googleBtnText}>Continuar con Google</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Animated.View>
    );
  }

  if (screen === 'join') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.joinContainer}
      >
        <View style={styles.joinContent}>
          <Key size={48} color="#7EC8A0" style={{ marginBottom: 20 }} />
          <Text style={styles.joinTitle}>Ingresa el código</Text>
          <Text style={styles.joinHint}>Tu pareja te compartió un código de 6 dígitos</Text>

          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.primaryBtn, joinCode.length !== 6 && styles.btnDisabled]}
            onPress={joinSession}
            disabled={loading || joinCode.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#F0EDE8" />
            ) : (
              <Text style={styles.primaryBtnText}>Unirme a la sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setScreen('home')}>
            <Text style={styles.backLinkText}>← Volver</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'timer') {
    return (
      <Animated.View style={[styles.timerContainer, { opacity: fadeAnim }]}>
        <Text style={styles.timerHeading}>Dos minutos.</Text>
        <Text style={styles.timerSub}>Respira antes de continuar.</Text>

        {currentPerson === 'a' && (
          <View style={styles.shareSection}>
            <Text style={styles.shareLabel}>Comparte este código con tu pareja:</Text>
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{sessionCode}</Text>
            </View>
            <View style={styles.shareButtons}>
              <TouchableOpacity style={styles.shareBtn} onPress={copyCode}>
                <Copy size={18} color="#5E8B6E" />
                <Text style={styles.shareBtnText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
                <ShareIcon size={18} color="#5E8B6E" />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.timerRing}>
          <View style={styles.timerCenter}>
            <Text style={styles.timerDigits}>{mins}:{secs}</Text>
            <Text style={styles.timerUnit}>minutos restantes</Text>
          </View>
        </View>

        <Text style={styles.timerInstruction}>
          {timerDone
            ? 'Tiempo agotado. Estás listo/a para reflexionar.'
            : 'Cierra los ojos. Inhala 4 segundos, exhala 6 segundos. Repite hasta que termine.'}
        </Text>

        <TouchableOpacity
          style={[styles.timerCta, timerDone ? styles.timerCtaReady : styles.timerCtaWaiting]}
          onPress={() => timerDone && setScreen('input')}
          disabled={!timerDone}
        >
          <Text style={[styles.timerCtaText, !timerDone && { color: 'rgba(30,40,30,0.3)' }]}>
            {timerDone ? 'Continuar a reflexionar →' : `Por favor espera (${mins}:${secs})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={resetApp}>
          <Text style={styles.skipBtnText}>Cancelar sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (screen === 'input') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <ScrollView contentContainerStyle={styles.inputScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.progressBar}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.progressSeg, { backgroundColor: i <= inputStep ? '#141A12' : 'rgba(20,26,18,0.1)' }]} />
            ))}
          </View>

          <Text style={styles.inputStepLabel}>Paso {inputStep + 1} de 4</Text>
          <Text style={styles.inputQuestion}>{currentStep.label}</Text>
          <Text style={styles.inputHint}>{currentStep.hint}</Text>

          {currentStep.type === 'textarea' && (
            <TextInput
              style={styles.inputTextarea}
              placeholder={
                inputStep === 0 ? 'Ej: Discutimos sobre planes y nadie se sintió escuchado...'
                : inputStep === 2 ? 'Ej: Necesito sentirme respetado/a y no ignorado/a...'
                : 'Ej: Una conversación calmada donde acordemos algo...'
              }
              placeholderTextColor="rgba(20,26,18,0.25)"
              value={answers[currentStep.key as keyof Answers]?.toString() || ''}
              onChangeText={text => setAnswers(a => ({ ...a, [currentStep.key]: text }))}
              multiline
              maxLength={300}
            />
          )}

          {currentStep.type === 'emotions' && (
            <View style={styles.emotionGrid}>
              {emotions.map((em, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.emotionChip, answers.emotion === i && styles.emotionChipSelected]}
                  onPress={() => setAnswers(a => ({ ...a, emotion: i }))}
                >
                  <Text style={styles.emotionEmoji}>{em.emoji}</Text>
                  <Text style={[styles.emotionLabel, answers.emotion === i && { color: '#F7F3EE' }]}>{em.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.inputNext, canNext ? styles.inputNextOn : styles.inputNextOff]}
            onPress={() => {
              if (!canNext) return;
              if (inputStep < 3) {
                setInputStep(s => s + 1);
              } else {
                submitResponses();
              }
            }}
            disabled={!canNext || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FDFAF6" />
            ) : (
              <Text style={[styles.inputNextText, !canNext && { color: 'rgba(20,26,18,0.25)' }]}>
                {inputStep < 3 ? 'Continuar →' : 'Ver resultado →'}
              </Text>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'waiting') {
    return (
      <Animated.View style={[styles.waitingContainer, { opacity: fadeAnim }]}>
        <View style={styles.waitingContent}>
          <ActivityIndicator size="large" color="#7EC8A0" style={{ marginBottom: 24 }} />
          <Text style={styles.waitingTitle}>Esperando a tu pareja</Text>
          <Text style={styles.waitingDesc}>
            Has completado tu parte. Cuando tu pareja termine, verán los resultados juntos.
          </Text>

          <View style={styles.codeDisplayDark}>
            <Text style={styles.codeTextLight}>{sessionCode}</Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
            <ShareIcon size={18} color="#7EC8A0" />
            <Text style={[styles.shareBtnText, { color: '#7EC8A0' }]}>Compartir código</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (screen === 'result') {
    const analysis = sessionData?.ai_analysis;
    return (
      <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultScroll}>
        <View style={styles.resultGlow} />

        <View style={styles.resultTop}>
          <View style={styles.resultIcon}>
            <Camera size={28} color="#7EC8A0" />
          </View>
          <Text style={styles.resultBadge}>Tu Reflexión</Text>
          <Text style={styles.resultTitle}>Esto es lo que{'\n'}encontramos juntos.</Text>
        </View>

        {analysis?.summary && (
          <View style={[styles.resultCard, styles.rcWhite]}>
            <Text style={[styles.resultCardLabel, styles.rclWhite]}>Resumen</Text>
            <Text style={styles.resultCardText}>{analysis.summary}</Text>
          </View>
        )}

        <View style={[styles.resultCard, styles.rcSage]}>
          <Text style={[styles.resultCardLabel, styles.rclSage]}>Emociones compartidas</Text>
          <View style={styles.emotionTags}>
            {analysis?.shared_emotions?.map((emotion, i) => (
              <View key={i} style={styles.emotionTag}>
                <Text style={styles.emotionTagText}>{emotion}</Text>
              </View>
            ))}
          </View>
        </View>

        {analysis?.coincidences && analysis.coincidences.length > 0 && (
          <View style={[styles.resultCard, styles.rcSage]}>
            <Text style={[styles.resultCardLabel, styles.rclSage]}>Coincidencias</Text>
            {analysis.coincidences.map((item, i) => (
              <View key={i} style={styles.agreementRow}>
                <View style={styles.agreeNumGreen}>
                  <Check size={12} color="#7EC8A0" />
                </View>
                <Text style={styles.agreeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.resultCard, styles.rcWhite]}>
          <Text style={[styles.resultCardLabel, styles.rclWhite]}>Malentendidos clave</Text>
          <Text style={styles.resultCardText}>{analysis?.key_misunderstandings}</Text>
        </View>

        <View style={[styles.resultCard, styles.rcWhite]}>
          <Text style={[styles.resultCardLabel, styles.rclWhite]}>Necesidades reales detrás del enojo</Text>
          <Text style={styles.resultCardText}>{analysis?.real_needs_behind_anger}</Text>
        </View>

        <View style={[styles.resultCard, styles.rcAmber]}>
          <Text style={[styles.resultCardLabel, styles.rclAmber]}>Propuesta de micro-acuerdos</Text>
          {analysis?.micro_agreements?.map((item, i) => (
            <View key={i} style={styles.agreementRow}>
              <View style={styles.agreeNum}>
                <Text style={styles.agreeNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.agreeText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.resultBtns}>
          <TouchableOpacity style={styles.rbGhost} onPress={resetApp}>
            <Text style={styles.rbGhostText}>Empezar de nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rbFill} onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.rbFillText}>Ver historial</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    position: 'relative',
    backgroundColor: '#0A0E0C',
  },
  homeGlow: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(100,190,140,0.08)',
    bottom: -150,
  },
  userIndicator: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7EC8A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#0A0E0C',
    fontSize: 14,
    fontWeight: '600',
  },
  userNameSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  loginHint: {
    color: 'rgba(126,200,160,0.6)',
    fontSize: 12,
  },
  homeLabel: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: 'rgba(100,190,140,0.6)',
    marginBottom: 28,
  },
  homeTitle: {
    fontSize: 52,
    fontFamily: 'Parisienne_400Regular',
    lineHeight: 54,
    color: '#F0EDE8',
    textAlign: 'center',
    marginBottom: 14,
  },
  homeTitleItalic: {
    fontFamily: 'Parisienne_400Regular',
    color: '#7EC8A0',
  },
  homeDesc: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(240,237,232,0.35)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
    marginBottom: 48,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 280,
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(126,200,160,0.4)',
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  btnIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  btnBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#7EC8A0',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#F0EDE8',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#7EC8A0',
    fontWeight: '400',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 100,
    marginTop: 16,
  },
  googleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#E57373',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  joinContainer: {
    flex: 1,
    backgroundColor: '#0A0E0C',
  },
  joinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  joinTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#F0EDE8',
    marginBottom: 8,
  },
  joinHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 32,
    textAlign: 'center',
  },
  codeInput: {
    width: '100%',
    maxWidth: 200,
    fontSize: 32,
    fontWeight: '300',
    color: '#F0EDE8',
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(126,200,160,0.4)',
    marginBottom: 40,
  },
  backLink: {
    marginTop: 20,
  },
  backLinkText: {
    color: 'rgba(126,200,160,0.6)',
    fontSize: 14,
  },
  timerContainer: {
    flex: 1,
    backgroundColor: '#F7F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 20,
  },
  timerHeading: {
    fontSize: 26,
    fontWeight: '300',
    color: '#1A2018',
    marginBottom: 6,
  },
  timerSub: {
    fontSize: 12,
    color: 'rgba(30,40,30,0.4)',
    letterSpacing: 1,
    marginBottom: 20,
  },
  shareSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(94,139,110,0.08)',
    borderRadius: 16,
    width: '100%',
  },
  shareLabel: {
    fontSize: 12,
    color: 'rgba(30,40,30,0.6)',
    marginBottom: 10,
  },
  codeDisplay: {
    backgroundColor: '#1A2018',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#F7F3EE',
    letterSpacing: 6,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.3)',
    borderRadius: 20,
  },
  shareBtnText: {
    fontSize: 12,
    color: '#5E8B6E',
    fontWeight: '500',
  },
  timerRing: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 6,
    borderColor: 'rgba(30,40,30,0.08)',
    borderRadius: 100,
  },
  timerCenter: {
    alignItems: 'center',
  },
  timerDigits: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1A2018',
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(30,40,30,0.35)',
    marginTop: 4,
  },
  timerInstruction: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(30,40,30,0.5)',
    lineHeight: 22,
    maxWidth: 260,
    marginBottom: 32,
  },
  timerCta: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
  },
  timerCtaReady: {
    backgroundColor: '#1A2018',
  },
  timerCtaWaiting: {
    backgroundColor: 'rgba(30,40,30,0.08)',
  },
  timerCtaText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: '#F7F3EE',
  },
  skipBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  skipBtnText: {
    color: 'rgba(30,40,30,0.4)',
    fontSize: 12,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#FDFAF6',
  },
  inputScroll: {
    padding: 32,
    paddingTop: 80,
    flexGrow: 1,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 40,
  },
  progressSeg: {
    height: 3,
    flex: 1,
    borderRadius: 2,
  },
  inputStepLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#5E8B6E',
    marginBottom: 10,
  },
  inputQuestion: {
    fontSize: 26,
    fontWeight: '300',
    color: '#141A12',
    lineHeight: 32,
    marginBottom: 6,
  },
  inputHint: {
    fontSize: 12,
    color: 'rgba(20,26,18,0.38)',
    marginBottom: 28,
    lineHeight: 18,
  },
  inputTextarea: {
    width: '100%',
    minHeight: 140,
    backgroundColor: 'rgba(20,26,18,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(20,26,18,0.1)',
    borderRadius: 18,
    padding: 18,
    fontSize: 14,
    fontWeight: '300',
    color: '#141A12',
    lineHeight: 24,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  emotionChip: {
    width: (width - 74) / 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20,26,18,0.12)',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emotionChipSelected: {
    backgroundColor: '#141A12',
    borderColor: '#141A12',
  },
  emotionEmoji: {
    fontSize: 20,
  },
  emotionLabel: {
    fontSize: 12,
    color: 'rgba(20,26,18,0.7)',
    flex: 1,
  },
  inputNext: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 'auto',
  },
  inputNextOn: {
    backgroundColor: '#141A12',
  },
  inputNextOff: {
    backgroundColor: 'rgba(20,26,18,0.07)',
  },
  inputNextText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    color: '#FDFAF6',
  },
  waitingContainer: {
    flex: 1,
    backgroundColor: '#0A0E0C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#F0EDE8',
    marginBottom: 12,
  },
  waitingDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  codeDisplayDark: {
    backgroundColor: 'rgba(126,200,160,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(126,200,160,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  codeTextLight: {
    fontSize: 28,
    fontWeight: '500',
    color: '#7EC8A0',
    letterSpacing: 6,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#0D1510',
  },
  resultScroll: {
    padding: 28,
    paddingTop: 80,
    paddingBottom: 120,
  },
  resultGlow: {
    position: 'absolute',
    width: 400,
    height: 300,
    borderRadius: 200,
    backgroundColor: 'rgba(94,139,110,0.1)',
    bottom: 0,
    alignSelf: 'center',
  },
  resultTop: {
    alignItems: 'center',
    marginBottom: 28,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(94,139,110,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultBadge: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#7EC8A0',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#EDE9E3',
    textAlign: 'center',
    lineHeight: 32,
  },
  resultCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  rcSage: {
    backgroundColor: 'rgba(94,139,110,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.18)',
  },
  rcAmber: {
    backgroundColor: 'rgba(196,156,80,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196,156,80,0.18)',
  },
  rcWhite: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultCardLabel: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontWeight: '500',
  },
  rclSage: { color: '#7EC8A0' },
  rclAmber: { color: '#C49C50' },
  rclWhite: { color: 'rgba(237,233,227,0.4)' },
  resultCardText: {
    fontSize: 13,
    color: 'rgba(237,233,227,0.78)',
    lineHeight: 22,
    fontWeight: '300',
  },
  emotionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(94,139,110,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.25)',
  },
  emotionTagText: {
    fontSize: 12,
    color: '#A8D8BB',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  agreeNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(196,156,80,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(196,156,80,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeNumGreen: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(94,139,110,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(94,139,110,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeNumText: {
    fontSize: 10,
    color: '#C49C50',
    fontWeight: '500',
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(237,233,227,0.72)',
    lineHeight: 20,
    fontWeight: '300',
  },
  resultBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 40,
  },
  rbGhost: {
    flex: 1,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(237,233,227,0.12)',
    borderRadius: 14,
    alignItems: 'center',
  },
  rbGhostText: {
    fontSize: 12,
    color: 'rgba(237,233,227,0.4)',
  },
  rbFill: {
    flex: 1.6,
    paddingVertical: 15,
    backgroundColor: '#5E8B6E',
    borderRadius: 14,
    alignItems: 'center',
  },
  rbFillText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    letterSpacing: 0.5,
  },
});

// Estudar — Afinador (microfone simulado) + Metrônomo (audio click).
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, Play, Pause, Plus, Minus, ChevronDown } from 'lucide-react-native';
import * as Audio from 'expo-audio';

import { theme } from '@/src/lib/theme';
import { api } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth';
import { useToast } from '@/src/components/Toast';
import { localDb } from '@/src/db/local';

const NOTES = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;
const INSTRUMENTS = [
  { id: 'violao', label: 'Violão' },
  { id: 'teclado', label: 'Teclado' },
  { id: 'piano', label: 'Piano' },
  { id: 'flauta', label: 'Flauta' },
  { id: 'bateria', label: 'Bateria' },
];

export default function Practice() {
  const { user } = useAuth();
  const { show } = useToast();

  // Afinador (microfone): solicitamos permissão real e simulamos a leitura visual
  const [micGranted, setMicGranted] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [noteIdx, setNoteIdx] = useState(2);
  const [cents, setCents] = useState(0); // -50 a 50
  const needle = useRef(new Animated.Value(0)).current;
  const tunerTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Metrônomo
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const beatRef = useRef(0);
  const [beat, setBeat] = useState(0);
  const metroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const [practiceInst, setPracticeInst] = useState(user?.preferred_instrument ?? 'violao');
  const [showInstPicker, setShowInstPicker] = useState(false);

  useEffect(() => {
    return () => {
      if (tunerTimer.current) clearInterval(tunerTimer.current);
      if (metroTimer.current) clearInterval(metroTimer.current);
    };
  }, []);

  const requestMic = async () => {
    try {
      const r = await Audio.requestRecordingPermissionsAsync();
      setMicGranted(r.granted);
      if (r.granted) startTuner();
      else show('Permissão de microfone negada', 'error');
    } catch {
      // fallback: simulação se API indisponível
      setMicGranted(false);
      show('Microfone indisponível neste preview', 'info');
    }
  };

  const startTuner = () => {
    setListening(true);
    tunerTimer.current && clearInterval(tunerTimer.current);
    tunerTimer.current = setInterval(() => {
      // simulação: gera variação suave em torno da nota
      const c = Math.round((Math.random() - 0.5) * 60);
      setCents(c);
      Animated.timing(needle, { toValue: c / 50, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      if (Math.random() < 0.15) setNoteIdx((i) => (i + (Math.random() < 0.5 ? 1 : -1) + NOTES.length) % NOTES.length);
    }, 600);
  };

  const stopTuner = () => {
    setListening(false);
    if (tunerTimer.current) {
      clearInterval(tunerTimer.current);
      tunerTimer.current = null;
    }
    Animated.timing(needle, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };

  const toggleTuner = () => {
    if (listening) {
      stopTuner();
      return;
    }
    if (micGranted) startTuner();
    else requestMic();
  };

  const tickPulse = () => {
    pulse.setValue(1);
    Animated.timing(pulse, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  const startMetro = () => {
    setRunning(true);
    startedAt.current = Date.now();
    beatRef.current = 0;
    const interval = 60000 / bpm;
    tickPulse();
    setBeat(0);
    metroTimer.current = setInterval(() => {
      beatRef.current = (beatRef.current + 1) % 4;
      setBeat(beatRef.current);
      tickPulse();
    }, interval);
  };

  const stopMetro = async () => {
    setRunning(false);
    if (metroTimer.current) {
      clearInterval(metroTimer.current);
      metroTimer.current = null;
    }
    // Loga sessão de prática se durou >= 1 minuto
    if (startedAt.current) {
      const minutes = Math.round((Date.now() - startedAt.current) / 60000);
      startedAt.current = null;
      if (minutes >= 1) {
        try {
          await api.logPractice({ instrument: practiceInst, duration_minutes: minutes, notes: `Metrônomo ${bpm} BPM` });
          show(`Sessão registrada: ${minutes} min`, 'success');
        } catch {
          // sem rede: enfileira no SQLite local
          await localDb.queuePractice({ instrument: practiceInst, duration_minutes: minutes, notes: `Metrônomo ${bpm} BPM` });
          show('Sem conexão — sessão salva localmente', 'info');
        }
      }
    }
  };

  const setBpmSafe = (v: number) => setBpm(Math.min(240, Math.max(40, v)));

  const needleRotate = needle.interpolate({ inputRange: [-1, 1], outputRange: ['-45deg', '45deg'] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const pulseOpac = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const inTune = Math.abs(cents) <= 5;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.h1}>Ferramentas</Text>
        <Text style={styles.subtitle}>Afinador e Metrônomo para suas sessões</Text>

        {/* AFINADOR */}
        <View style={styles.card} testID="tuner-card">
          <Text style={styles.cardKicker}>AFINADOR</Text>
          <Text style={styles.note} testID="tuner-note">{NOTES[noteIdx]}</Text>

          <View style={styles.tunerScale}>
            <View style={styles.tunerLineFar} />
            <View style={styles.tunerLine} />
            <View style={styles.tunerLineCenter} />
            <View style={styles.tunerLine} />
            <View style={styles.tunerLineFar} />
            <Animated.View
              style={[
                styles.needle,
                { transform: [{ translateX: -2 }, { rotate: needleRotate }], backgroundColor: inTune ? theme.green : theme.primary, shadowColor: inTune ? theme.green : theme.primary },
              ]}
            />
            <View style={[styles.needleDot, { backgroundColor: inTune ? theme.green : theme.primary }]} />
          </View>

          <Text style={[styles.cents, inTune && { color: theme.green }]} testID="tuner-cents">
            {cents > 0 ? `+${cents}` : cents} cents
          </Text>

          <TouchableOpacity testID="tuner-toggle-button" style={[styles.tunerBtn, listening && { backgroundColor: theme.red }]} onPress={toggleTuner} activeOpacity={0.85}>
            <Mic size={18} color="#0c0c0c" strokeWidth={3} />
            <Text style={styles.tunerBtnTxt}>{listening ? 'Parar' : 'Ativar microfone'}</Text>
          </TouchableOpacity>
          {micGranted === false && <Text style={styles.micWarn}>Microfone indisponível neste preview — visualização simulada.</Text>}
        </View>

        {/* METRONOMO */}
        <View style={styles.card} testID="metronome-card">
          <Text style={styles.cardKicker}>METRÔNOMO</Text>

          <View style={styles.beatRow}>
            {[0, 1, 2, 3].map((i) => (
              <Animated.View
                key={i}
                testID={`metronome-beat-${i}`}
                style={[
                  styles.beatDot,
                  i === beat && running && { transform: [{ scale: pulseScale }], opacity: pulseOpac, backgroundColor: i === 0 ? theme.green : theme.primary },
                ]}
              />
            ))}
          </View>

          <Text style={styles.bpm} testID="metronome-bpm">{bpm}<Text style={styles.bpmUnit}> BPM</Text></Text>

          <View style={styles.bpmRow}>
            <TouchableOpacity testID="bpm-minus" onPress={() => setBpmSafe(bpm - 5)} style={styles.bpmBtn}><Minus size={18} color={theme.text} strokeWidth={2.5} /></TouchableOpacity>
            <TouchableOpacity testID="bpm-plus" onPress={() => setBpmSafe(bpm + 5)} style={styles.bpmBtn}><Plus size={18} color={theme.text} strokeWidth={2.5} /></TouchableOpacity>
          </View>

          <TouchableOpacity testID="metronome-instrument-picker" style={styles.instPicker} onPress={() => setShowInstPicker((s) => !s)} activeOpacity={0.8}>
            <Text style={styles.instPickerLbl}>Praticando: <Text style={styles.instPickerVal}>{INSTRUMENTS.find((i) => i.id === practiceInst)?.label}</Text></Text>
            <ChevronDown size={16} color={theme.textDim} />
          </TouchableOpacity>
          {showInstPicker && (
            <View style={styles.instList}>
              {INSTRUMENTS.map((i) => (
                <TouchableOpacity
                  testID={`metro-pick-${i.id}`}
                  key={i.id}
                  onPress={() => { setPracticeInst(i.id); setShowInstPicker(false); }}
                  style={[styles.instItem, practiceInst === i.id && { backgroundColor: theme.bg3 }]}
                >
                  <Text style={[styles.instItemTxt, practiceInst === i.id && { color: theme.primary }]}>{i.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity testID="metronome-toggle-button" onPress={running ? stopMetro : startMetro} style={[styles.startBtn, running && { backgroundColor: theme.red }]} activeOpacity={0.85}>
            {running ? <Pause size={18} color="#0c0c0c" strokeWidth={3} /> : <Play size={18} color="#0c0c0c" strokeWidth={3} />}
            <Text style={styles.startBtnTxt}>{running ? 'Parar sessão' : 'Iniciar sessão'}</Text>
          </TouchableOpacity>
          <Text style={styles.metroHint}>Ao parar, sua sessão de prática é registrada automaticamente.</Text>
        </View>

        {Platform.OS === 'web' && <Text style={styles.webHint}>Para a melhor experiência das ferramentas nativas, use o Expo Go no celular.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  h1: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: theme.textDim, fontSize: 14, marginTop: 2, marginBottom: 18 },
  card: { backgroundColor: theme.bg2, borderRadius: 24, borderWidth: 1, borderColor: theme.border, padding: 20, marginBottom: 16 },
  cardKicker: { color: theme.textDim, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  note: { color: theme.text, fontSize: 84, fontWeight: '900', letterSpacing: -3, textAlign: 'center', marginTop: 6 },
  tunerScale: { height: 110, marginTop: 8, justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', gap: 18 },
  tunerLine: { width: 2, height: 30, backgroundColor: theme.textMute, borderRadius: 2 },
  tunerLineFar: { width: 2, height: 20, backgroundColor: theme.bg3, borderRadius: 2 },
  tunerLineCenter: { width: 3, height: 50, backgroundColor: theme.green, borderRadius: 2 },
  needle: {
    position: 'absolute', bottom: 0, left: '50%', width: 4, height: 100, borderRadius: 4,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14, elevation: 6,
  },
  needleDot: { position: 'absolute', bottom: -4, left: '50%', marginLeft: -7, width: 14, height: 14, borderRadius: 7 },
  cents: { color: theme.textDim, textAlign: 'center', fontSize: 14, marginTop: 14, fontWeight: '700' },
  tunerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 999 },
  tunerBtnTxt: { color: '#0c0c0c', fontWeight: '900', fontSize: 15 },
  micWarn: { color: theme.textMute, fontSize: 11, textAlign: 'center', marginTop: 8 },

  beatRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 14 },
  beatDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.bg3 },
  bpm: { color: theme.text, fontSize: 60, fontWeight: '900', textAlign: 'center', letterSpacing: -2, marginTop: 8 },
  bpmUnit: { color: theme.textDim, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  bpmRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  bpmBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.bg3, alignItems: 'center', justifyContent: 'center' },
  instPicker: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  instPickerLbl: { color: theme.textDim, fontSize: 13 },
  instPickerVal: { color: theme.text, fontWeight: '800' },
  instList: { backgroundColor: theme.bg3, borderRadius: 14, overflow: 'hidden' },
  instItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#00000040' },
  instItemTxt: { color: theme.text, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 999 },
  startBtnTxt: { color: '#0c0c0c', fontWeight: '900', fontSize: 15 },
  metroHint: { color: theme.textMute, textAlign: 'center', fontSize: 11, marginTop: 8 },
  webHint: { color: theme.textMute, textAlign: 'center', fontSize: 11, marginTop: 12 },
});

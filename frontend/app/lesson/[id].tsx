// Detalhe da lição com quiz interativo.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, CheckCircle2, XCircle, Award } from 'lucide-react-native';

import { api } from '@/src/lib/api';
import { theme } from '@/src/lib/theme';
import { Button } from '@/src/components/Button';
import { useToast } from '@/src/components/Toast';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { show } = useToast();
  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const l = await api.lesson(id);
      setLesson(l);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading || !lesson) {
    return (
      <SafeAreaView style={styles.center}><ActivityIndicator color={theme.primary} /></SafeAreaView>
    );
  }

  const submit = async () => {
    const total = lesson.quiz.length;
    const correct = lesson.quiz.reduce(
      (acc: number, q: any, i: number) => acc + (answers[i] === q.answer ? 1 : 0), 0,
    );
    const sc = Math.round((correct / total) * 100);
    setScore(sc);
    setSubmitted(true);
    setSaving(true);
    try {
      await api.completeLesson(lesson.id, sc);
      show(`Lição concluída! Você acertou ${correct}/${total}.`, 'success');
    } catch (e: any) {
      show(e?.message || 'Erro ao registrar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={20} color={theme.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.kicker}>{lesson.level} · {lesson.duration_minutes} min</Text>
        </View>
        <Text style={styles.title} testID="lesson-title">{lesson.title}</Text>
        <Text style={styles.summary}>{lesson.summary}</Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipKicker}>DICA</Text>
          <Text style={styles.tipBody}>
            Pratique com o metrônomo em um BPM confortável e foque na execução limpa antes de aumentar a velocidade.
          </Text>
        </View>

        <Text style={styles.section}>Quiz</Text>
        {lesson.quiz.map((q: any, i: number) => (
          <View key={i} style={styles.qCard} testID={`quiz-question-${i}`}>
            <Text style={styles.qTxt}>{i + 1}. {q.q}</Text>
            {q.options.map((opt: string, oi: number) => {
              const chosen = answers[i] === oi;
              const correct = submitted && oi === q.answer;
              const wrong = submitted && chosen && oi !== q.answer;
              return (
                <TouchableOpacity
                  testID={`quiz-${i}-option-${oi}`}
                  key={oi}
                  disabled={submitted}
                  onPress={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                  style={[styles.opt, chosen && { borderColor: theme.primary }, correct && { borderColor: theme.green, backgroundColor: '#10381F' }, wrong && { borderColor: theme.red, backgroundColor: '#3A1518' }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.optTxt, chosen && { color: theme.text, fontWeight: '700' }]}>{opt}</Text>
                  {correct && <CheckCircle2 size={18} color={theme.green} strokeWidth={2.5} />}
                  {wrong && <XCircle size={18} color={theme.red} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {submitted && score !== null && (
          <View style={[styles.resultBox, { borderColor: score >= 70 ? theme.green : theme.primary }]} testID="quiz-result">
            <Award size={22} color={score >= 70 ? theme.green : theme.primary} strokeWidth={2.5} />
            <Text style={styles.resultTxt}>Resultado: <Text style={{ color: score >= 70 ? theme.green : theme.primary }}>{score}%</Text></Text>
            <Text style={styles.resultHint}>Tempo de prática registrado automaticamente.</Text>
          </View>
        )}

        {!submitted ? (
          <Button
            testID="quiz-submit-button"
            title="Concluir lição"
            onPress={submit}
            disabled={Object.keys(answers).length !== lesson.quiz.length}
            loading={saving}
          />
        ) : (
          <Button testID="back-to-lessons-button" title="Voltar às lições" onPress={() => router.back()} variant="secondary" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  kicker: { color: theme.textDim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  title: { color: theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  summary: { color: theme.textDim, fontSize: 14, marginTop: 8, lineHeight: 22 },
  tipBox: { backgroundColor: '#1F1A14', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#3A2C18' },
  tipKicker: { color: theme.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  tipBody: { color: theme.text, marginTop: 4, fontSize: 13, lineHeight: 20 },
  section: { color: theme.text, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  qCard: { backgroundColor: theme.bg2, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 12 },
  qTxt: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, marginTop: 6 },
  optTxt: { color: theme.textDim, fontSize: 14, flex: 1, marginRight: 8 },
  resultBox: { backgroundColor: theme.bg2, borderWidth: 1.5, borderRadius: 16, padding: 16, marginVertical: 16, alignItems: 'center' },
  resultTxt: { color: theme.text, marginTop: 8, fontSize: 18, fontWeight: '800' },
  resultHint: { color: theme.textMute, fontSize: 12, marginTop: 4 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, displayDate, type Loan, type Summary, money } from './src';

const C = {
  ink: '#172F2A', muted: '#73857F', deep: '#113C33', green: '#187D5F',
  greenSoft: '#E8F4ED', bg: '#F7FAF8', white: '#FFFFFF', border: '#E6EDE9',
  red: '#D04C4B', redSoft: '#FFF0EE', amber: '#A36220', amberSoft: '#FFF4E5',
};
const initialSummary: Summary = { totalLent: 0, totalRepaid: 0, overdueAmount: 0, outstandingAmount: 0, currency: 'INR' };
const dateToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Btn = ({ text, onPress, loading, variant = 'solid', disabled = false }: {
  text: string; onPress: () => void; loading?: boolean; variant?: 'solid' | 'outline'; disabled?: boolean;
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel={text}
    activeOpacity={0.8}
    disabled={disabled || loading}
    onPress={onPress}
    style={[styles.button, variant === 'outline' && styles.buttonOutline, (disabled || loading) && { opacity: 0.55 }]}
  >
    {loading ? <ActivityIndicator color={variant === 'outline' ? C.deep : C.white} /> :
      <Text style={[styles.buttonText, variant === 'outline' && styles.buttonTextOutline]}>{text}</Text>}
  </TouchableOpacity>
);
const Field = ({ title, placeholder, value, onChangeText, keyboardType, maxLength, autoCapitalize, testID }: {
  title: string; placeholder: string; value: string; onChangeText: (s: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'decimal-pad' | 'number-pad';
  maxLength?: number; autoCapitalize?: 'none' | 'words'; testID?: string;
}) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.fieldLabel}>{title}</Text>
    <TextInput
      testID={testID}
      style={styles.fieldInput}
      placeholder={placeholder}
      placeholderTextColor="#A4B1AB"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize || 'none'}
      autoCorrect={false}
    />
  </View>
);

function Login({ onLoggedIn }: { onLoggedIn: (token: string) => Promise<void> }) {
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sendOtp = async () => {
    setError(''); setLoading(true);
    try {
      await api('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone: phone.trim() }) });
      setStep('otp');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  const verify = async () => {
    setError(''); setLoading(true);
    try {
      const result = await api<{ token: string }>('/auth/verify-otp', {
        method: 'POST', body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      await onLoggedIn(result.token);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.loginWrap}>
          <View style={styles.logo}><Text style={styles.logoText}>₹</Text></View>
          <Text style={styles.brand}>MiniLedger<Text style={{ color: C.green }}>.</Text></Text>
          <Text style={styles.tagline}>Lent money? Stay on top of it.</Text>
          <View style={styles.loginCard}>
            <Text style={styles.sectionTitle}>{step === 'phone' ? 'Welcome back' : 'Verify your number'}</Text>
            <Text style={styles.formHelp}>{step === 'phone' ? 'Sign in with your phone number to manage loans.' : `Enter the 6-digit code for ${phone}.`}</Text>
            {step === 'phone' ?
              <Field title="PHONE NUMBER" placeholder="+919876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={16} testID="phone-input" /> :
              <Field title="ONE-TIME PASSWORD" placeholder="6-digit code" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} testID="otp-input" />}
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Btn text={step === 'phone' ? 'Send OTP  →' : 'Verify & continue  →'} onPress={step === 'phone' ? sendOtp : verify} loading={loading} />
            {step === 'otp' && <TouchableOpacity style={styles.secondaryLink} onPress={() => { setStep('phone'); setOtp(''); setError(''); }}><Text style={styles.secondaryLinkText}>Change phone number</Text></TouchableOpacity>}
          </View>
          <View style={styles.securityNote}><Text style={styles.securityNoteText}>🔒  Your entries are private to your account.</Text></View>
          <Text style={styles.demoNote}>DEMO MODE  •  The OTP appears in your backend terminal.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  return (
    <View>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}><Text style={styles.heroLabel}>TOTAL OUTSTANDING</Text><Text style={styles.heroIcon}>↗</Text></View>
        <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>{money(summary.outstandingAmount)}</Text>
        <Text style={styles.heroFoot}>Money you're waiting to receive</Text>
        <View style={styles.heroArtOne} /><View style={styles.heroArtTwo} />
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}><Text style={styles.metricIcon}>↗</Text><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{money(summary.totalLent)}</Text><Text style={styles.metricLabel}>Total lent</Text></View>
        <View style={styles.metricCard}><Text style={[styles.metricIcon, { color: C.green }]}>✓</Text><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{money(summary.totalRepaid)}</Text><Text style={styles.metricLabel}>Repaid</Text></View>
        <View style={[styles.metricCard, summary.overdueAmount > 0 && { backgroundColor: C.redSoft }]}><Text style={[styles.metricIcon, { color: C.red }]}>!</Text><Text style={[styles.metricValue, summary.overdueAmount > 0 && { color: C.red }]} numberOfLines={1} adjustsFontSizeToFit>{money(summary.overdueAmount)}</Text><Text style={styles.metricLabel}>Overdue</Text></View>
      </View>
    </View>
  );
}

function LoanCard({ loan, onRepay }: { loan: Loan; onRepay: (loan: Loan) => void }) {
  const paid = loan.status === 'repaid';
  const overdue = loan.status === 'overdue';
  return (
    <View style={[styles.loanCard, overdue && styles.loanCardOverdue]} testID={`loan-${loan.id}`}>
      <View style={styles.loanTop}>
        <View style={[styles.avatar, overdue ? { backgroundColor: '#F9DEDA' } : paid ? { backgroundColor: '#EDF0EE' } : { backgroundColor: C.greenSoft }]}>
          <Text style={[styles.avatarText, overdue && { color: C.red }, paid && { color: C.muted }]}>{loan.friendName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.loanMain}><Text style={styles.friendName} numberOfLines={1}>{loan.friendName}</Text><Text style={styles.loanDate}>Due {displayDate(loan.dueDate)}</Text></View>
        <View style={styles.loanAmountGroup}><Text style={styles.loanAmount}>{money(loan.amount)}</Text><View style={[styles.statusPill, overdue ? styles.pillOverdue : paid ? styles.pillPaid : styles.pillPending]}><Text style={[styles.statusText, overdue ? { color: C.red } : paid ? { color: C.muted } : { color: C.green }]}>{paid ? 'Repaid' : overdue ? 'Overdue' : 'Pending'}</Text></View></View>
      </View>
      {!paid && <TouchableOpacity style={styles.repayRow} onPress={() => onRepay(loan)} accessibilityLabel={`Mark ${loan.friendName}'s loan as repaid`}><Text style={styles.repayText}>✓  Mark as repaid</Text><Text style={styles.repayChevron}>→</Text></TouchableOpacity>}
    </View>
  );
}

function AddLoanModal({ visible, close, onSaved, token }: { visible: boolean; close: () => void; onSaved: () => Promise<void>; token: string }) {
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(dateToday());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    if (!friendName.trim() || friendName.trim().length > 80) { setError('Enter a friend name (1–80 characters).'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0 || Number(amount) > 10_000_000) { setError('Enter a valid positive amount (max 2 decimals).'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(new Date(`${dueDate}T00:00:00Z`).getTime()) || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate) { setError('Enter a valid date as YYYY-MM-DD.'); return; }
    setLoading(true);
    try {
      await api('/loans', { method: 'POST', body: JSON.stringify({ friendName: friendName.trim(), amount: Number(amount), dueDate }) }, token);
      await onSaved();
      setFriendName(''); setAmount(''); setDueDate(dateToday()); close();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeading}><View><Text style={styles.sectionTitle}>Add a loan</Text><Text style={styles.formHelp}>Keep a record of what you lent.</Text></View><TouchableOpacity onPress={close} style={styles.closeButton}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
            <Field title="FRIEND'S NAME" placeholder="e.g. Priya Sharma" value={friendName} onChangeText={setFriendName} maxLength={80} autoCapitalize="words" testID="friend-input" />
            <Field title="AMOUNT (₹)" placeholder="e.g. 1500" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" testID="amount-input" />
            <Field title="DUE DATE (YYYY-MM-DD)" placeholder="YYYY-MM-DD" value={dueDate} onChangeText={setDueDate} maxLength={10} testID="due-date-input" />
            <Text style={styles.formTip}>You can add past dates too. Overdue entries are automatically highlighted.</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Btn text="Save loan  →" onPress={submit} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Dashboard({ token, signOut }: { token: string; signOut: () => Promise<void> }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [tab, setTab] = useState<'all' | 'pending' | 'repaid'>('all');
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [list, totals] = await Promise.all([
        api<{ loans: Loan[] }>('/loans', {}, token),
        api<Summary>('/loans/summary', {}, token),
      ]);
      setLoans(list.loans); setSummary(totals); setError('');
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => loans.filter(loan => tab === 'all' || (tab === 'repaid' ? loan.status === 'repaid' : loan.status !== 'repaid')), [loans, tab]);
  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };
  const onRepay = (loan: Loan) => Alert.alert('Mark as repaid?', `${loan.friendName} returned ${money(loan.amount)}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Yes, mark repaid', onPress: async () => {
      try { await api(`/loans/${loan.id}/repay`, { method: 'PATCH' }, token); await refresh(); }
      catch (e) { Alert.alert('Could not update loan', (e as Error).message); }
    } },
  ]);
  const header = (
    <View>
      <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR PERSONAL LEDGER</Text><Text style={styles.headerTitle}>Overview<Text style={{ color: C.green }}>.</Text></Text></View><TouchableOpacity style={styles.profileButton} onPress={() => Alert.alert('Sign out', 'Sign out of MiniLedger?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => { void signOut(); } }])}><Text style={styles.profileIcon}>↪</Text></TouchableOpacity></View>
      <SummaryView summary={summary} />
      <View style={styles.listHeader}><View><Text style={styles.listTitle}>Your entries</Text><Text style={styles.listSub}>{loans.length} {loans.length === 1 ? 'entry' : 'entries'} tracked</Text></View><TouchableOpacity onPress={() => setShowForm(true)} style={styles.smallAdd}><Text style={styles.smallAddText}>＋ Add new</Text></TouchableOpacity></View>
      <View style={styles.tabs}>{(['all', 'pending', 'repaid'] as const).map(t => <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}><Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'all' ? 'All' : t === 'pending' ? 'Outstanding' : 'Repaid'}</Text></TouchableOpacity>)}</View>
      {!!error && <View style={styles.errorBanner}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={() => void refresh()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>}
    </View>
  );
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={C.green} /><Text style={styles.emptyText}>Loading your ledger…</Text></View> :
        <FlatList
          style={{ flex: 1 }} contentContainerStyle={styles.dashboardWrap}
          data={filtered} keyExtractor={loan => loan.id} ListHeaderComponent={header}
          renderItem={({ item }) => <LoanCard loan={item} onRepay={onRepay} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>◌</Text><Text style={styles.emptyTitle}>Nothing here yet</Text><Text style={styles.emptyText}>{tab === 'all' ? 'Track your first loan to get started.' : `No ${tab === 'pending' ? 'outstanding' : 'repaid'} loans to display.`}</Text>{tab === 'all' && <TouchableOpacity onPress={() => setShowForm(true)}><Text style={styles.emptyLink}>Add your first entry  →</Text></TouchableOpacity>}</View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={C.green} />}
          ListFooterComponent={<View style={{ height: 92 }} />}
        />}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} accessibilityLabel="Add a loan"><Text style={styles.fabText}>＋</Text></TouchableOpacity>
      <AddLoanModal visible={showForm} close={() => setShowForm(false)} onSaved={refresh} token={token} />
    </SafeAreaView>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem('miniledger_token').then(setToken).catch(console.warn).finally(() => setLoading(false));
  }, []);
  const loggedIn = async (newToken: string) => { await AsyncStorage.setItem('miniledger_token', newToken); setToken(newToken); };
  const signOut = async () => { await AsyncStorage.removeItem('miniledger_token'); setToken(null); };
  if (loading) return <SafeAreaView style={[styles.screen, styles.center]}><ActivityIndicator size="large" color={C.green} /></SafeAreaView>;
  return token ? <Dashboard token={token} signOut={signOut} /> : <Login onLoggedIn={loggedIn} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginWrap: { paddingHorizontal: 26, flexGrow: 1, justifyContent: 'center', paddingVertical: 42 },
  logo: { width: 66, height: 66, backgroundColor: C.deep, borderRadius: 19, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 15, transform: [{ rotate: '-6deg' }] },
  logoText: { color: C.white, fontSize: 37, fontWeight: '800' },
  brand: { fontSize: 34, fontWeight: '800', letterSpacing: -1.5, color: C.ink, textAlign: 'center' },
  tagline: { marginTop: 8, textAlign: 'center', color: C.muted, fontSize: 15, marginBottom: 39 },
  loginCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 22, shadowColor: C.deep, shadowOpacity: 0.05, shadowRadius: 18, elevation: 2 },
  sectionTitle: { color: C.ink, fontWeight: '800', fontSize: 24, letterSpacing: -0.6 },
  formHelp: { fontSize: 13.5, color: C.muted, lineHeight: 21, marginTop: 7, marginBottom: 22 },
  fieldBlock: { marginBottom: 18 },
  fieldLabel: { color: C.deep, fontWeight: '800', fontSize: 11, letterSpacing: 1.2, marginBottom: 9 },
  fieldInput: { borderWidth: 1, borderColor: '#DCE7E1', borderRadius: 12, paddingHorizontal: 15, height: 54, color: C.ink, fontSize: 16, backgroundColor: '#FAFCFA' },
  button: { height: 54, backgroundColor: C.deep, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  buttonOutline: { borderWidth: 1, borderColor: C.deep, backgroundColor: C.white },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 15.5 },
  buttonTextOutline: { color: C.deep },
  error: { color: C.red, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  secondaryLink: { alignItems: 'center', marginTop: 21 },
  secondaryLinkText: { fontSize: 14, color: C.green, fontWeight: '700' },
  securityNote: { alignItems: 'center', marginTop: 28 },
  securityNoteText: { color: C.muted, fontSize: 12.5 },
  demoNote: { color: '#A8B5AD', textAlign: 'center', fontSize: 10, marginTop: 26, letterSpacing: 1 },
  dashboardWrap: { paddingHorizontal: 20, paddingTop: 23 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  eyebrow: { color: C.muted, letterSpacing: 1.6, fontWeight: '800', fontSize: 10 },
  headerTitle: { fontSize: 31, color: C.ink, fontWeight: '800', letterSpacing: -1.2, marginTop: 6 },
  profileButton: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  profileIcon: { fontSize: 25, color: C.deep, fontWeight: '700' },
  heroCard: { backgroundColor: C.deep, borderRadius: 22, padding: 23, overflow: 'hidden', minHeight: 179, justifyContent: 'center' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 },
  heroLabel: { color: '#BBD5C9', letterSpacing: 1.6, fontSize: 10, fontWeight: '800' },
  heroIcon: { color: '#BBD5C9', fontSize: 23 },
  heroAmount: { color: C.white, fontSize: 42, fontWeight: '800', letterSpacing: -1.5, marginTop: 11, zIndex: 2 },
  heroFoot: { color: '#A2C5B7', fontSize: 12.5, marginTop: 6, zIndex: 2 },
  heroArtOne: { position: 'absolute', right: -66, bottom: -120, width: 260, height: 260, borderRadius: 130, backgroundColor: '#225847' },
  heroArtTwo: { position: 'absolute', right: -90, bottom: -78, width: 170, height: 170, borderRadius: 85, backgroundColor: '#2C6956' },
  metricsRow: { flexDirection: 'row', gap: 9, marginTop: 11 },
  metricCard: { flex: 1, padding: 13, backgroundColor: C.white, borderColor: C.border, borderWidth: 1, borderRadius: 15, minWidth: 0 },
  metricIcon: { fontSize: 20, color: C.deep, fontWeight: '800', marginBottom: 15 },
  metricValue: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  metricLabel: { fontSize: 11, color: C.muted },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 19 },
  listTitle: { fontSize: 22, color: C.ink, fontWeight: '800', letterSpacing: -0.5 },
  listSub: { fontSize: 12, color: C.muted, marginTop: 4 },
  smallAdd: { backgroundColor: C.greenSoft, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  smallAddText: { color: C.green, fontWeight: '800', fontSize: 12 },
  tabs: { flexDirection: 'row', padding: 4, backgroundColor: '#E9F0EB', borderRadius: 14, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10 },
  tabActive: { backgroundColor: C.white, shadowColor: C.deep, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: C.muted },
  tabTextActive: { color: C.deep },
  loanCard: { backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 15, paddingTop: 17, marginBottom: 11, borderWidth: 1, borderColor: C.border },
  loanCardOverdue: { borderColor: '#F5C7C1', backgroundColor: '#FFFDFC' },
  loanTop: { flexDirection: 'row', alignItems: 'center', paddingBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 14, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  avatarText: { fontSize: 18, color: C.green, fontWeight: '800' },
  loanMain: { flex: 1, minWidth: 0 },
  friendName: { fontSize: 14.5, fontWeight: '800', color: C.ink },
  loanDate: { color: C.muted, fontSize: 11.5, marginTop: 5 },
  loanAmountGroup: { alignItems: 'flex-end', marginLeft: 7 },
  loanAmount: { color: C.ink, fontSize: 17, fontWeight: '800' },
  statusPill: { marginTop: 7, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 7 },
  pillOverdue: { backgroundColor: C.redSoft },
  pillPaid: { backgroundColor: '#F0F3F1' },
  pillPending: { backgroundColor: C.greenSoft },
  statusText: { fontSize: 10, fontWeight: '800' },
  repayRow: { borderTopWidth: 1, borderColor: C.border, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between' },
  repayText: { fontSize: 12, color: C.green, fontWeight: '800' },
  repayChevron: { color: C.green, fontSize: 15 },
  empty: { paddingVertical: 56, alignItems: 'center' },
  emptyIcon: { fontSize: 55, color: '#A1B8AE' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 9 },
  emptyText: { color: C.muted, fontSize: 13, marginTop: 8, textAlign: 'center' },
  emptyLink: { color: C.green, fontWeight: '800', marginTop: 22 },
  fab: { position: 'absolute', right: 23, bottom: 28, backgroundColor: C.green, width: 61, height: 61, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: C.green, shadowOpacity: 0.3, shadowRadius: 12, elevation: 7 },
  fabText: { fontSize: 32, color: C.white, fontWeight: '400', lineHeight: 38 },
  modalOverlay: { flex: 1, backgroundColor: '#142C2580', justifyContent: 'flex-end' },
  modalContainer: { maxHeight: '92%', backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalContent: { paddingHorizontal: 24, paddingBottom: 36, paddingTop: 13 },
  modalHandle: { width: 38, height: 5, borderRadius: 4, backgroundColor: '#D8E4DE', alignSelf: 'center', marginBottom: 22 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F5F3', borderRadius: 10 },
  closeText: { fontSize: 24, color: C.muted },
  formTip: { color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, backgroundColor: C.redSoft, borderRadius: 12, marginBottom: 12 },
  retryText: { color: C.red, fontWeight: '800', fontSize: 12 },
});

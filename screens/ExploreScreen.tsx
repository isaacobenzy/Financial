import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from '@/lib/toast';

type SMS = {
  id: string;
  address: string;
  body: string;
  date: string;
};

const DEMO_MESSAGES: SMS[] = [
  {
    id: '1',
    address: 'MTN MoMo',
    body: 'Payment received GHS 250.00 from John Doe. Current Balance: GHS 1,240.50',
    date: String(Date.now() - 86400000),
  },
  {
    id: '2',
    address: 'GCB Bank',
    body: 'Debited GHS 45.00 at SUPERMARKET. Available bal: GHS 890.00',
    date: String(Date.now() - 172800000),
  },
  {
    id: '3',
    address: 'Vodafone Cash',
    body: 'You sent GHS 100.00 to 024XXXX123. Fee: GHS 1.00. Ref: TXN998877',
    date: String(Date.now() - 259200000),
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<SMS[]>(DEMO_MESSAGES);
  const [hasPermission, setHasPermission] = useState(Platform.OS !== 'android');
  const [usingDemo, setUsingDemo] = useState(true);

  const loadMessages = async () => {
    if (Platform.OS !== 'android') {
      setMessages(DEMO_MESSAGES);
      setUsingDemo(true);
      return;
    }

    try {
      // Native SMS reader is not available in Expo Go; use demo data there.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SmsAndroid = require('react-native-get-sms-android');
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          bodyRegex: '(.*)(?:credited|debited|sent|received|payment|transaction)(.*)',
        }),
        (fail: string) => {
          console.log('SMS load failed:', fail);
          setMessages(DEMO_MESSAGES);
          setUsingDemo(true);
          toast.info('Using demo SMS messages');
        },
        (_count: number, smsList: string) => {
          const arr = JSON.parse(smsList) as SMS[];
          setMessages(arr.length ? arr : DEMO_MESSAGES);
          setUsingDemo(!arr.length);
        },
      );
    } catch {
      setMessages(DEMO_MESSAGES);
      setUsingDemo(true);
      toast.info('SMS import needs a development build. Showing demo messages.');
    }
  };

  const requestReadSMSPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message: 'Financial Copilot needs access to your SMS to analyze transactions.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(ok);
        if (ok) {
          await loadMessages();
        }
      } else {
        setHasPermission(true);
        await loadMessages();
      }
    } catch (err) {
      console.warn(err);
      setHasPermission(true);
      setMessages(DEMO_MESSAGES);
      setUsingDemo(true);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestReadSMSPermission();
    } else {
      setHasPermission(true);
    }
  }, []);

  const renderItem = ({ item }: { item: SMS }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <MaterialCommunityIcons name="bank" size={24} color="#007AFF" />
        <Text style={styles.sender}>{item.address}</Text>
      </View>
      <Text style={styles.messageBody}>{item.body}</Text>
      <Text style={styles.messageDate}>
        {new Date(parseInt(item.date, 10)).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>SMS Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="message-alert" size={64} color="#007AFF" />
          <Text style={styles.permissionText}>
            We need permission to read your SMS messages to analyze transactions
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestReadSMSPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              setHasPermission(true);
              setMessages(DEMO_MESSAGES);
              setUsingDemo(true);
            }}
          >
            <Text style={styles.demoButtonText}>Continue with demo SMS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {usingDemo ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>Showing demo SMS transactions</Text>
            </View>
          ) : null}
          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  banner: {
    backgroundColor: '#E8F1FF',
    padding: 12,
  },
  bannerText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sender: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  messageBody: {
    fontSize: 14,
    color: '#666',
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  demoButton: {
    padding: 12,
  },
  demoButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

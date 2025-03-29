import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SmsAndroid from 'react-native-get-sms-android';

type SMS = {
  id: string;
  address: string;
  body: string;
  date: string;
  type: string;
};

export default function ExploreScreen() {
  const [messages, setMessages] = useState<SMS[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

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
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          loadMessages();
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const loadMessages = () => {
    if (Platform.OS === 'android') {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          bodyRegex: '(.*)(?:credited|debited|sent|received|payment|transaction)(.*)',
        }),
        (fail) => console.log('Failed with this error: ' + fail),
        (count, smsList) => {
          const arr = JSON.parse(smsList);
          setMessages(arr);
        },
      );
    }
  };

  useEffect(() => {
    requestReadSMSPermission();
  }, []);

  const renderItem = ({ item }: { item: SMS }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <MaterialCommunityIcons name="bank" size={24} color="#007AFF" />
        <Text style={styles.sender}>{item.address}</Text>
      </View>
      <Text style={styles.messageBody}>{item.body}</Text>
      <Text style={styles.messageDate}>
        {new Date(parseInt(item.date)).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SMS Transactions</Text>
      </View>

      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="message-alert" size={64} color="#007AFF" />
          <Text style={styles.permissionText}>
            We need permission to read your SMS messages to analyze transactions
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestReadSMSPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
});
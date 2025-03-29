import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { parseSMS } from '../utils/smsParser';
import { toast } from 'sonner-native';

export default function ImportSMSScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSMSImport = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        const PermissionsAndroid = require('react-native').PermissionsAndroid;
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          const SmsAndroid = require('react-native-get-sms-android').default;
          
          SmsAndroid.list(
            JSON.stringify({
              box: 'inbox',
              bodyRegex: '(GHS|transaction|payment|received|sent)',
              indexFrom: 0,
              maxCount: 100,
            }),
            (fail) => {
              console.error('Failed to get SMS', fail);
              toast.error('Failed to import SMS messages');
            },
            (count, smsList) => {
              const newTransactions = [];
              
              JSON.parse(smsList).forEach((sms) => {
                const transaction = parseSMS(sms.body);
                if (transaction) {
                  newTransactions.push(transaction);
                }
              });
              
              setTransactions(newTransactions);
              toast.success(`Imported ${newTransactions.length} transactions`);
            },
          );
        } else {
          toast.error('SMS permission denied');
        }
      } else {
        // iOS Implementation
        toast.error('SMS import not available on iOS. Please use PDF statements instead.');
      }
    } catch (error) {
      console.error('SMS Import Error:', error);
      toast.error('Failed to import SMS messages');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Import SMS</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.importButton}
          onPress={handleSMSImport}
          disabled={loading}
        >
          <MaterialCommunityIcons name="message-text" size={24} color="#fff" />
          <Text style={styles.importButtonText}>
            {loading ? 'Importing...' : 'Import SMS Messages'}
          </Text>
        </TouchableOpacity>

        {transactions.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Found {transactions.length} transactions
            </Text>
            <Text style={styles.summaryAmount}>
              Total: GH₵ {getTotalAmount()}
            </Text>
          </View>
        )}

        <ScrollView style={styles.transactionList}>
          {transactions.map((transaction, index) => (
            <View key={index} style={styles.transaction}>
              <View style={styles.transactionHeader}>
                <Text style={styles.merchant}>{transaction.merchant}</Text>
                <Text style={[
                  styles.amount,
                  { color: transaction.type === 'income' ? '#4CAF50' : '#F44336' }
                ]}>
                  {transaction.amount < 0 ? '-' : '+'}GH₵ {Math.abs(transaction.amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.category}>{transaction.category}</Text>
                <Text style={styles.date}>{transaction.date}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    marginTop: 24,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  transactionList: {
    flex: 1,
  },
  transaction: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
});
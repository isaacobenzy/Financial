import React, { useState, useEffect } from 'react';
import {
  StatusBar, 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  PermissionsAndroid,
  ActivityIndicator,
  ListRenderItem
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { SafeAreaView } from 'react-native-safe-area-context';


// Define the SMS message interface
interface SmsMessage {
  _id: string;
  thread_id: string;
  address: string;
  person: string | null;
  date: string;
  date_sent: string;
  protocol: number;
  read: number;
  status: number;
  type: number;
  body: string;
  service_center: string | null;
}

// Define filter options interface for SMS queries
interface SmsFilter {
  box: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued';
  read?: number;
  _id?: string;
  address?: string;
  body?: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const requestReadSmsPermission = async (): Promise<boolean> => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Read Permission",
          message: "This app needs access to read your SMS messages",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("SMS permission granted");
        setHasPermission(true);
        return true;
      } else {
        console.log("SMS permission denied");
        setHasPermission(false);
        setLoading(false);
        return false;
      }
    } catch (err) {
      console.warn(err);
      setLoading(false);
      return false;
    }
  };

  const loadMessages = (): void => {
    const filter: SmsFilter = {
      box: 'inbox',
      // You can add more filters as needed:
      // read: 0, // 0 for unread SMS, 1 for read SMS
      // _id: '1234', // SMS with specific _id
      // address: '+1222333444', // SMS from specific address
      // body: 'Hello', // SMS containing specific text
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        console.log('Failed to get SMS: ' + fail);
        setLoading(false);
      },
      (count: number, smsList: string) => {
        console.log('Count: ', count);
        const arr: SmsMessage[] = JSON.parse(smsList);
        setMessages(arr);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    const initApp = async (): Promise<void> => {
      const hasPermission = await requestReadSmsPermission();
      if (hasPermission) {
        loadMessages();
      }
    };
    
    initApp();
  }, []);

  const formatDate = (timestamp: string): string => {
    const date = new Date(parseInt(timestamp, 10));
    return date.toLocaleString();
  };

  const renderItem: ListRenderItem<SmsMessage> = ({ item }) => (
    <View style={styles.messageContainer}>
      <View style={styles.messageHeader}>
        <Text style={styles.sender}>{item.address}</Text>
        <Text style={styles.timestamp}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.messageBody}>{item.body}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>SMS permission denied</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestReadSmsPermission}
        >
          <Text style={styles.permissionButtonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SMS Messages</Text>
      </View>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item: SmsMessage) => item._id.toString()}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  messageContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sender: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timestamp: {
    color: '#757575',
    fontSize: 12,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default App;
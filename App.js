import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import { PermissionsAndroid } from 'react-native';
import { NativeModules } from 'react-native';

const { ScreenshotControl } = NativeModules;

const App = () => {
  const [loading, setLoading] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }
  };

  const getLocation = async () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        error => reject(error),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  };

  const getPublicIp = async () => {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  };

  const toggleScreenshot = async () => {
    setLoading(true);
    try {
      const newState = !isActivated;
      const pluginResponse = await ScreenshotControl.activateScreenshot(newState);
      if (pluginResponse) {
        setIsActivated(newState);
        const screenshotStatus = newState ? 'Enabled' : 'Disabled';
        const location = await getLocation();
        const publicIp = await getPublicIp();
        const deviceInfo = {
          os: Platform.OS,
          deviceName: await DeviceInfo.getDeviceName(),
          macAddress: await DeviceInfo.getMacAddress(),
          imei: Platform.OS === 'android' ? await DeviceInfo.getImei() : 'N/A',
          location,
          publicIp,
          screenshotStatus,
        };
        await axios.post('https://example.com/api/screenshot-status', deviceInfo);
        Alert.alert('Success', `Screenshots are now ${screenshotStatus}`);
      } else {
        Alert.alert('Error', 'Failed to update screenshot status');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Image source={require('./assets/snack-icon.png')} style={{ width: 100, height: 100 }} />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <TouchableOpacity
          style={{
            padding: 10,
            backgroundColor: isActivated ? 'green' : 'gray',
            borderRadius: 5,
            marginTop: 20,
          }}
          onPress={toggleScreenshot}
        >
          <Text style={{ color: '#fff' }}>{isActivated ? 'Activated' : 'Activate'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default App;

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import App from './App';
import { Alert, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';

// Mocking NativeModules
NativeModules.ScreenshotControl = {
  activateScreenshot: jest.fn(),
};

// Mocking DeviceInfo
jest.mock('react-native-device-info', () => ({
  getDeviceName: jest.fn(),
  getMacAddress: jest.fn(),
  getImei: jest.fn(),
}));

// Mocking Geolocation
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));

// Mocking axios
jest.mock('axios');

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the initial state correctly', () => {
    const { getByText, getByTestId } = render(<App />);
    expect(getByText('Activate')).toBeTruthy();
  });

  test('requests permissions on mount', async () => {
    const PermissionsAndroid = require('react-native').PermissionsAndroid;
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce('granted');

    render(<App />);

    await waitFor(() => {
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    });
  });

  test('toggles screenshot activation successfully', async () => {
    NativeModules.ScreenshotControl.activateScreenshot.mockResolvedValueOnce(true);
    Geolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({
        coords: { latitude: 12.34, longitude: 56.78 },
      })
    );
    axios.get.mockResolvedValueOnce({ data: { ip: '123.45.67.89' } });
    axios.post.mockResolvedValueOnce({});
    DeviceInfo.getDeviceName.mockResolvedValueOnce('Mock Device');
    DeviceInfo.getMacAddress.mockResolvedValueOnce('00:11:22:33:44:55');
    DeviceInfo.getImei.mockResolvedValueOnce('123456789012345');

    const { getByText } = render(<App />);

    const button = getByText('Activate');
    fireEvent.press(button);

    await waitFor(() => {
      expect(NativeModules.ScreenshotControl.activateScreenshot).toHaveBeenCalledWith(true);
      expect(axios.post).toHaveBeenCalledWith('https://example.com/api/screenshot-status', {
        os: 'ios', // or 'android' depending on test platform
        deviceName: 'Mock Device',
        macAddress: '00:11:22:33:44:55',
        imei: '123456789012345',
        location: { latitude: 12.34, longitude: 56.78 },
        publicIp: '123.45.67.89',
        screenshotStatus: 'Enabled',
      });
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Screenshots are now Enabled');
    });
  });

  test('handles screenshot activation failure', async () => {
    NativeModules.ScreenshotControl.activateScreenshot.mockResolvedValueOnce(false);

    const { getByText } = render(<App />);

    const button = getByText('Activate');
    fireEvent.press(button);

    await waitFor(() => {
      expect(NativeModules.ScreenshotControl.activateScreenshot).toHaveBeenCalledWith(true);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update screenshot status');
    });
  });

  test('displays an error if something goes wrong', async () => {
    NativeModules.ScreenshotControl.activateScreenshot.mockRejectedValueOnce(new Error('Mock Error'));

    const { getByText } = render(<App />);

    const button = getByText('Activate');
    fireEvent.press(button);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong');
    });
  });
});

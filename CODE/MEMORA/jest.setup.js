jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock @env (react-native-dotenv) to provide controlled environment variables in tests
jest.mock('@env', () => ({
  OPENAI_API_KEY: undefined,
  GEMINI_API_KEY: undefined,
  FIREBASE_API_KEY: undefined,
  FIREBASE_AUTH_DOMAIN: undefined,
  FIREBASE_PROJECT_ID: undefined,
  FIREBASE_STORAGE_BUCKET: undefined,
  FIREBASE_MESSAGING_SENDER_ID: undefined,
  FIREBASE_APP_ID: undefined,
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  moveAsync: jest.fn(),
  documentDirectory: '/mock/document/',
  cacheDirectory: '/mock/cache/',
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getAssetsAsync: jest.fn(() =>
    Promise.resolve({
      assets: [],
      endCursor: null,
      hasNextPage: false,
      totalCount: 0,
    })
  ),
  getAssetInfoAsync: jest.fn(() => Promise.resolve(null)),
  createAssetAsync: jest.fn(() => Promise.resolve({ id: 'mock-asset-id' })),
  deleteAssetsAsync: jest.fn(() => Promise.resolve(true)),
  createAlbumAsync: jest.fn(() => Promise.resolve({ id: 'mock-album-id' })),
  addAssetsToAlbumAsync: jest.fn(() => Promise.resolve(true)),
  getAlbumsAsync: jest.fn(() => Promise.resolve([])),
  MediaType: {
    photo: 'photo',
    video: 'video',
    audio: 'audio',
    unknown: 'unknown',
  },
  SortBy: {
    creationTime: 'creationTime',
    modificationTime: 'modificationTime',
    default: 'default',
  },
}));

jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  setMinimumIntervalAsync: jest.fn(() => Promise.resolve()),
  getStatusAsync: jest.fn(() => Promise.resolve(3)),
  BackgroundFetchStatus: {
    Available: 3,
    Denied: 1,
    Restricted: 2,
  },
  BackgroundFetchResult: {
    NewData: 2,
    NoData: 1,
    Failed: 3,
  },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  getRegisteredTasksAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'mock-brand',
  manufacturer: 'mock-manufacturer',
  modelName: 'mock-model',
  osName: 'Android',
  osVersion: '13',
}));

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(() => Promise.resolve(0.8)),
  getBatteryStateAsync: jest.fn(() => Promise.resolve(1)), // UNPLUGGED
  BatteryState: {
    UNKNOWN: 0,
    UNPLUGGED: 1,
    CHARGING: 2,
    FULL: 3,
  },
}), { virtual: true });

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'WIFI',
    })
  ),
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    BLUETOOTH: 'BLUETOOTH',
    ETHERNET: 'ETHERNET',
    WIMAX: 'WIMAX',
    VPN: 'VPN',
    OTHER: 'OTHER',
  },
}), { virtual: true });

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: true,
      assets: null,
    })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: true,
      assets: null,
    })
  ),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
}));

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
  },
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SettingsManager = {
    settings: {},
    getConstants: () => ({}),
  };
  RN.NativeModules.PlatformConstants = {
    getConstants: () => ({}),
  };
  return RN;
});

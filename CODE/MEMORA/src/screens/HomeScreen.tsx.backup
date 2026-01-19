import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { RootState } from '../store';
import { addCaption, addProcessing, removeProcessing } from '../store/captionsSlice';
import { createOpenAIService, hasValidApiKey } from '../services/openai';
import { ImageMetadataService } from '../services/imageMetadata';
import { Caption } from '../types';

const { width: screenWidth } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null);
  
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const { processing } = useSelector((state: RootState) => state.captions);

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const takePhoto = async () => {
    try {
      if (!cameraPermission?.granted) {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      if (!mediaPermission?.granted) {
        Alert.alert('Permission needed', 'Media library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const processImage = async (imageUri: string) => {
    if (!settings.autoProcessImages) {
      return;
    }

    setIsProcessing(true);
    dispatch(addProcessing(imageUri));

    try {
      // Generate caption using user's API key or fallback to default
      const openaiService = createOpenAIService(settings.openAIApiKey);
      const captionText = await openaiService.generateImageCaption(imageUri);
      
      const newCaption: Caption = {
        id: Date.now().toString(),
        imageId: imageUri,
        shortDescription: captionText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        processed: true,
      };

      setCurrentCaption(newCaption);
      dispatch(addCaption(newCaption));
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setIsProcessing(false);
      dispatch(removeProcessing(imageUri));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setCurrentCaption(null);
  };

  const saveToGallery = () => {
    if (currentCaption) {
      Alert.alert('Saved!', 'Image and caption saved to your gallery');
      navigation.navigate('Gallery');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={{ fontSize: 32, color: '#6366f1' }}>🧠</Text>
        <Text style={styles.title}>Memora</Text>
        <Text style={styles.subtitle}>Capture memories with AI</Text>
      </View>

      {!selectedImage ? (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={takePhoto}>
            <Text style={{ fontSize: 32, color: 'white' }}>📷</Text>
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
            <Text style={{ fontSize: 32, color: '#6366f1' }}>🖼️</Text>
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage }} style={styles.image} />
          
          {isProcessing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Processing image...</Text>
            </View>
          )}

          {currentCaption && !isProcessing && (
            <View style={styles.captionContainer}>
              <Text style={styles.captionTitle}>AI Caption:</Text>
              <Text style={styles.captionText}>{currentCaption.shortDescription}</Text>
              
              <View style={styles.metadataContainer}>
                <Text style={styles.metadataTitle}>Details:</Text>
                <Text style={styles.metadataText}>
                  Created: {new Date(currentCaption.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={saveToGallery}>
              <Text style={{ fontSize: 24, color: 'white' }}>💾</Text>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearImage}>
              <Text style={{ fontSize: 24, color: '#ef4444' }}>❌</Text>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Gallery')}
        >
          <Text style={{ fontSize: 24, color: '#6366f1' }}>🖼️</Text>
          <Text style={styles.quickActionText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={{ fontSize: 24, color: '#6366f1' }}>⚙️</Text>
          <Text style={styles.quickActionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {processing.length > 0 && (
        <View style={styles.processingIndicator}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.processingText}>Processing images in background...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  actionContainer: {
    gap: 16,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    gap: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: '600',
  },
  imageContainer: {
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    gap: 12,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  captionContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  captionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  captionText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  metadataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  clearButton: {
    flex: 1,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ef4444',
    gap: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
  },
  quickActionText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    gap: 8,
  },
  processingText: {
    color: '#64748b',
    fontSize: 14,
  },
});
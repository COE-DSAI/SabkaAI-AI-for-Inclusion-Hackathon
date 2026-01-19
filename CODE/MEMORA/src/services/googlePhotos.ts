import { GooglePhotosUploadResponse, GooglePhotosMediaItem } from '../types';

const GOOGLE_PHOTOS_API_BASE = 'https://photoslibrary.googleapis.com/v1';

export class GooglePhotosService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async uploadPhoto(imageUri: string, description?: string): Promise<string | null> {
    try {
      // Step 1: Upload the photo to get an upload token
      const uploadToken = await this.uploadPhotoBytes(imageUri);
      
      if (!uploadToken) {
        throw new Error('Failed to get upload token');
      }

      // Step 2: Create media item with the upload token
      const mediaItem = await this.createMediaItem(uploadToken, description);
      
      return mediaItem?.id || null;
    } catch (error) {
      console.error('Error uploading photo to Google Photos:', error);
      throw error;
    }
  }

  private async uploadPhotoBytes(imageUri: string): Promise<string | null> {
    try {
      // Get image data
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(`${GOOGLE_PHOTOS_API_BASE}/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-type': 'application/octet-stream',
          'X-Goog-Upload-Content-Type': blob.type,
          'X-Goog-Upload-Protocol': 'raw',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadToken = await uploadResponse.text();
      return uploadToken;
    } catch (error) {
      console.error('Error uploading photo bytes:', error);
      return null;
    }
  }

  private async createMediaItem(uploadToken: string, description?: string): Promise<GooglePhotosMediaItem | null> {
    try {
      const requestBody = {
        newMediaItems: [
          {
            description: description || '',
            simpleMediaItem: {
              uploadToken: uploadToken,
            },
          },
        ],
      };

      const response = await fetch(`${GOOGLE_PHOTOS_API_BASE}/mediaItems:batchCreate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Create media item failed: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.newMediaItemResults || data.newMediaItemResults.length === 0) {
        throw new Error('No media item created');
      }

      const result = data.newMediaItemResults[0];
      
      if (result.status?.code !== 0) {
        throw new Error(`Media item creation failed: ${result.status?.message}`);
      }

      return result.mediaItem;
    } catch (error) {
      console.error('Error creating media item:', error);
      return null;
    }
  }

  async updateMediaItemDescription(mediaItemId: string, description: string): Promise<boolean> {
    try {
      // Note: Google Photos API doesn't support updating descriptions after creation
      // This is a limitation of the API. We can only set descriptions during creation.
      console.warn('Google Photos API does not support updating descriptions after creation');
      return false;
    } catch (error) {
      console.error('Error updating media item description:', error);
      return false;
    }
  }

  async getMediaItems(pageSize: number = 50, pageToken?: string): Promise<{
    mediaItems: GooglePhotosMediaItem[];
    nextPageToken?: string;
  }> {
    try {
      // Build query parameters manually since URLSearchParams is not available in React Native
      let queryParams = `pageSize=${pageSize}`;
      
      if (pageToken) {
        queryParams += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const response = await fetch(`${GOOGLE_PHOTOS_API_BASE}/mediaItems?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get media items: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        mediaItems: data.mediaItems || [],
        nextPageToken: data.nextPageToken,
      };
    } catch (error) {
      console.error('Error getting media items:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${GOOGLE_PHOTOS_API_BASE}/albums?pageSize=1`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Google Photos connection test failed:', error);
      return false;
    }
  }
}

export const createGooglePhotosService = (accessToken: string) => new GooglePhotosService(accessToken);
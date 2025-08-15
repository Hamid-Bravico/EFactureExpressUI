import { secureApiClient } from '../../../config/api';
import { SETTINGS_ENDPOINTS } from './settings.endpoints';
import { ApiResponse } from '../../auth/types/auth.types';
import { SettingsMap, SettingUpdatePayload, UpdateSettingsResponse, GetSettingsResponse } from '../types/settings.types';

export const settingsService = {
  async getAll(): Promise<SettingsMap> {
    const response = await secureApiClient.get(SETTINGS_ENDPOINTS.BASE);
    const responseData: ApiResponse<GetSettingsResponse> = await response.json();
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch settings';
      throw new Error(errorMessage);
    }
    
    // Convert the settings array to a SettingsMap
    const settingsMap: SettingsMap = {};
    if (responseData.data?.settings) {
      responseData.data.settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
    }
    
    return settingsMap;
  },

  async updateMany(payload: SettingUpdatePayload[]): Promise<SettingsMap> {
    const trimmedPayload = payload.map(p => ({ 
      Key: p.key.trim(), 
      Value: typeof p.value === 'string' ? (p.value as string).trim() : String(p.value) 
    }));
    const requestBody = { Settings: trimmedPayload };
    const response = await secureApiClient.put(SETTINGS_ENDPOINTS.BASE, requestBody);
    const responseData: ApiResponse<UpdateSettingsResponse> = await response.json();
    
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to update settings';
      throw new Error(errorMessage);
    }
    
    // Convert the settings array back to a SettingsMap
    const settingsMap: SettingsMap = {};
    if (responseData.data?.settings) {
      responseData.data.settings.forEach(setting => {
        settingsMap[setting.key] = setting.value;
      });
    }
    
    return settingsMap;
  },

  async getByKey(key: string): Promise<string | number | boolean | null> {
    const response = await secureApiClient.get(SETTINGS_ENDPOINTS.BY_KEY(key));
    const responseData: ApiResponse<{ key: string; value: string | number | boolean | null }> = await response.json();
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to fetch setting';
      throw new Error(errorMessage);
    }
    return responseData.data?.value ?? null;
  },

  async updateByKey(key: string, value: string | number | boolean | null): Promise<{ key: string; value: string | number | boolean | null }> {
    const payload = { Value: typeof value === 'string' ? (value as string).trim() : String(value) };
    const response = await secureApiClient.put(SETTINGS_ENDPOINTS.BY_KEY(key.trim()), payload);
    const responseData: ApiResponse<{ key: string; value: string | number | boolean | null }> = await response.json();
    if (!response.ok || !responseData?.succeeded) {
      const errorMessage = responseData?.errors?.join(', ') || responseData?.message || 'Failed to update setting';
      throw new Error(errorMessage);
    }
    return responseData.data!;
  }
};



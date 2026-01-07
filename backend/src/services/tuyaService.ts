import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface TuyaConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string; // e.g., 'https://openapi.tuyaus.com' or 'https://openapi.tuyaeu.com'
}

interface TuyaTokenResponse {
  access_token: string;
  refresh_token: string;
  expire_time: number; // seconds
  uid: string;
}

interface TuyaDevice {
  id: string;
  name: string;
  category: string;
  product_id: string;
  online: boolean;
  ip: string;
  time_zone: string;
  active_time: number;
  create_time: number;
  update_time: number;
  status: Array<{
    code: string;
    value: any;
  }>;
}

class TuyaService {
  private config: TuyaConfig;
  private apiClient: AxiosInstance;

  constructor(config: TuyaConfig) {
    this.config = config;
    this.apiClient = axios.create({
      baseURL: config.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Generate Tuya API signature
   */
  private generateSignature(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string = ''
  ): string {
    const timestamp = headers['t'].toString();
    const nonce = headers['client_id'];
    const stringToSign = [method, body, headers['Sign-Headers'], nonce, timestamp].join('\n');
    const signStr = this.config.clientId + timestamp + nonce + stringToSign;
    return crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * Get access token using authorization code
   */
  async getAccessToken(code: string, redirectUri: string): Promise<TuyaTokenResponse> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const headers = {
      'client_id': this.config.clientId,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': '',
    };

    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    };

    const signature = this.generateSignature('POST', '/v1.0/token', headers, JSON.stringify(body));
    headers['sign'] = signature;

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/v1.0/token`,
        body,
        { headers }
      );

      return {
        access_token: response.data.result.access_token,
        refresh_token: response.data.result.refresh_token,
        expire_time: response.data.result.expire_time,
        uid: response.data.result.uid,
      };
    } catch (error: any) {
      console.error('Tuya token error:', error.response?.data || error.message);
      throw new Error(`Failed to get Tuya access token: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TuyaTokenResponse> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const headers = {
      'client_id': this.config.clientId,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': '',
    };

    const body = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };

    const signature = this.generateSignature('POST', '/v1.0/token', headers, JSON.stringify(body));
    headers['sign'] = signature;

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/v1.0/token`,
        body,
        { headers }
      );

      return {
        access_token: response.data.result.access_token,
        refresh_token: response.data.result.refresh_token,
        expire_time: response.data.result.expire_time,
        uid: response.data.result.uid,
      };
    } catch (error: any) {
      console.error('Tuya refresh token error:', error.response?.data || error.message);
      throw new Error(`Failed to refresh Tuya token: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Get user's devices
   */
  async getDevices(accessToken: string, uid: string): Promise<TuyaDevice[]> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const path = `/v1.0/users/${uid}/devices`;

    const headers: Record<string, string> = {
      'client_id': this.config.clientId,
      'access_token': accessToken,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': 'access_token',
    };

    const signature = this.generateSignature('GET', path, headers);
    headers['sign'] = signature;

    try {
      const response = await axios.get(`${this.config.baseUrl}${path}`, { headers });
      return response.data.result || [];
    } catch (error: any) {
      console.error('Tuya get devices error:', error.response?.data || error.message);
      throw new Error(`Failed to get Tuya devices: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Control device
   */
  async controlDevice(
    accessToken: string,
    deviceId: string,
    commands: Array<{ code: string; value: any }>
  ): Promise<boolean> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const path = `/v1.0/devices/${deviceId}/commands`;

    const headers: Record<string, string> = {
      'client_id': this.config.clientId,
      'access_token': accessToken,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': 'access_token',
    };

    const body = { commands };
    const signature = this.generateSignature('POST', path, headers, JSON.stringify(body));
    headers['sign'] = signature;

    try {
      const response = await axios.post(`${this.config.baseUrl}${path}`, body, { headers });
      return response.data.success === true;
    } catch (error: any) {
      console.error('Tuya control device error:', error.response?.data || error.message);
      throw new Error(`Failed to control Tuya device: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(accessToken: string, deviceId: string): Promise<any> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const path = `/v1.0/devices/${deviceId}/status`;

    const headers: Record<string, string> = {
      'client_id': this.config.clientId,
      'access_token': accessToken,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': 'access_token',
    };

    const signature = this.generateSignature('GET', path, headers);
    headers['sign'] = signature;

    try {
      const response = await axios.get(`${this.config.baseUrl}${path}`, { headers });
      return response.data.result || [];
    } catch (error: any) {
      console.error('Tuya get device status error:', error.response?.data || error.message);
      throw new Error(`Failed to get Tuya device status: ${error.response?.data?.msg || error.message}`);
    }
  }

  /**
   * Get device specifications/schema
   */
  async getDeviceSpecifications(accessToken: string, deviceId: string): Promise<any> {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const path = `/v1.0/devices/${deviceId}/specifications`;

    const headers: Record<string, string> = {
      'client_id': this.config.clientId,
      'access_token': accessToken,
      't': timestamp,
      'sign_method': 'HMAC-SHA256',
      'Sign-Headers': 'access_token',
    };

    const signature = this.generateSignature('GET', path, headers);
    headers['sign'] = signature;

    try {
      const response = await axios.get(`${this.config.baseUrl}${path}`, { headers });
      return response.data.result || {};
    } catch (error: any) {
      console.error('Tuya get device specifications error:', error.response?.data || error.message);
      // Don't throw - specifications are optional
      return {};
    }
  }
}

// Create singleton instance
let tuyaServiceInstance: TuyaService | null = null;

export function initializeTuyaService() {
  const clientId = process.env.TUYA_CLIENT_ID;
  const clientSecret = process.env.TUYA_CLIENT_SECRET;
  const region = process.env.TUYA_REGION || 'us';

  if (!clientId || !clientSecret) {
    console.warn('Tuya credentials not configured. Tuya integration will be disabled.');
    return null;
  }

  const baseUrlMap: Record<string, string> = {
    us: 'https://openapi.tuyaus.com',
    eu: 'https://openapi.tuyaeu.com',
    cn: 'https://openapi.tuyacn.com',
    in: 'https://openapi.tuyain.com',
  };

  const baseUrl = baseUrlMap[region] || baseUrlMap.us;

  tuyaServiceInstance = new TuyaService({
    clientId,
    clientSecret,
    baseUrl,
  });

  return tuyaServiceInstance;
}

export function getTuyaService(): TuyaService {
  if (!tuyaServiceInstance) {
    throw new Error('Tuya service not initialized. Call initializeTuyaService() first.');
  }
  return tuyaServiceInstance;
}

export type { TuyaDevice, TuyaTokenResponse };


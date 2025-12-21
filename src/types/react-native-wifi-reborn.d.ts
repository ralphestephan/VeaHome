declare module 'react-native-wifi-reborn' {
  export default class WifiManager {
    /**
     * Gets the current WiFi SSID
     * @returns Promise<string> - The SSID of the currently connected WiFi network
     */
    static getCurrentWifiSSID(): Promise<string>;

    /**
     * Connect to a protected WiFi network (with password)
     * @param ssid - The SSID of the network to connect to
     * @param password - The password for the network
     * @param isWEP - Whether the network uses WEP encryption (default: false)
     * @param isHidden - Whether the network is hidden (iOS only, default: false)
     * @returns Promise<void>
     */
    static connectToProtectedSSID(
      ssid: string,
      password: string,
      isWEP: boolean,
      isHidden?: boolean
    ): Promise<void>;

    /**
     * Disconnect from current WiFi network
     * @returns Promise<void>
     */
    static disconnect(): Promise<void>;

    /**
     * Get list of available WiFi networks (Android only)
     * @returns Promise<Array<{SSID: string, BSSID: string, capabilities: string, frequency: number, level: number, timestamp: number}>>
     */
    static loadWifiList(): Promise<
      Array<{
        SSID: string;
        BSSID: string;
        capabilities: string;
        frequency: number;
        level: number;
        timestamp: number;
      }>
    >;

    /**
     * Check if WiFi is enabled
     * @returns Promise<boolean>
     */
    static isEnabled(): Promise<boolean>;

    /**
     * Enable WiFi (Android only)
     * @returns Promise<void>
     */
    static setEnabled(enabled: boolean): Promise<void>;

    /**
     * Get current WiFi signal strength
     * @returns Promise<number> - Signal strength in dBm
     */
    static getCurrentSignalStrength(): Promise<number>;

    /**
     * Get WiFi frequency (Android only)
     * @returns Promise<number> - Frequency in MHz
     */
    static getFrequency(): Promise<number>;

    /**
     * Get WiFi IP address
     * @returns Promise<string>
     */
    static getIP(): Promise<string>;

    /**
     * Get WiFi BSSID
     * @returns Promise<string>
     */
    static getBSSID(): Promise<string>;
  }
}

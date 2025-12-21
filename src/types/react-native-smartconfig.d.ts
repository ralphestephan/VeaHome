declare module 'react-native-smartconfig' {
  export interface SmartConfigOptions {
    type: 'esptouch' | 'airkiss';
    ssid: string;
    bssid: string;
    password: string;
    timeout?: number;
  }

  export interface SmartConfigResult {
    bssid: string;
    ipv4: string;
  }

  class SmartConfig {
    static start(options: SmartConfigOptions): Promise<SmartConfigResult>;
    static stop(): void;
  }

  export default SmartConfig;
}

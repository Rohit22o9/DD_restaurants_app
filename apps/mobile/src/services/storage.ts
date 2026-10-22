import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@dailydrop_partner_token';
const USER_KEY = '@dailydrop_partner_user';
const RESTAURANT_KEY = '@dailydrop_partner_restaurant';

export const storage = {
  async saveAuth(token: string, user: any, restaurant: any) {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
      [RESTAURANT_KEY, JSON.stringify(restaurant)],
    ]);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async getRestaurant(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(RESTAURANT_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async clearAuth() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, RESTAURANT_KEY]);
  },
};

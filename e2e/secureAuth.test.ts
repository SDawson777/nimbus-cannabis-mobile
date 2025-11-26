import { device, element, by, expect } from 'detox';

describe('Secure Auth Flow', () => {
  it('should persist token securely', async () => {
    await device.launchApp({ delete: true });
    await element(by.id('login-button')).tap();
    await element(by.id('email-input')).typeText('test@nimbus.app');
    await element(by.id('password-input')).typeText('Test1234');
    await element(by.id('submit-button')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('should retrieve secure data after app restart', async () => {
    await device.reloadReactNative();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});

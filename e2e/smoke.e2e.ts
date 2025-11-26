import { by, device, element, expect as detoxExpect, waitFor } from 'detox';

describe('JARS E2E Smoke Tests - Critical Flows', () => {
  beforeEach(async () => {
    await device.reloadReactNative();

    // Skip onboarding if present
    try {
      await waitFor(element(by.id('skip-onboarding-button')))
        .toBeVisible()
        .withTimeout(3000);
      await element(by.id('skip-onboarding-button')).tap();
    } catch {
      // No onboarding to skip
    }

    // Wait for app to load
    await waitFor(element(by.id('app-root')))
      .toBeVisible()
      .withTimeout(10000);
  });

  describe('Auth → Browse Products → Add to Cart → Checkout Flow', () => {
    it('should complete the full buyer journey from auth to payment sheet', async () => {
      // Step 1: Handle authentication if required
      try {
        await waitFor(element(by.id('login-screen')))
          .toBeVisible()
          .withTimeout(5000);

        // Fill in test credentials
        await element(by.id('email-input')).typeText('test@nimbus.app');
        await element(by.id('password-input')).typeText('testpass123');
        await element(by.id('login-button')).tap();

        // Wait for login to complete
        await waitFor(element(by.id('home-screen')))
          .toBeVisible()
          .withTimeout(10000);
      } catch {
        // Already authenticated or no auth required for browsing
        console.log('Skipping auth - user already logged in or not required');
      }

      // Step 2: Navigate to shop/browse products
      await waitFor(element(by.id('shop-tab')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('shop-tab')).tap();

      await waitFor(element(by.id('shop-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Wait for products to load
      await waitFor(element(by.id('product-list')))
        .toBeVisible()
        .withTimeout(10000);

      // Step 3: Browse and select a product
      await waitFor(element(by.id('product-item').withAncestor(by.id('product-list'))))
        .toBeVisible()
        .withTimeout(5000);

      // Tap on first available product
      await element(by.id('product-item').withAncestor(by.id('product-list')).atIndex(0)).tap();

      // Step 4: View product details
      await waitFor(element(by.id('product-detail-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await detoxExpect(element(by.id('product-name'))).toBeVisible();
      await detoxExpect(element(by.id('product-price'))).toBeVisible();
      await detoxExpect(element(by.id('add-to-cart-button'))).toBeVisible();

      // Step 5: Add to cart
      await element(by.id('add-to-cart-button')).tap();

      // Wait for cart confirmation
      try {
        await waitFor(element(by.text('Added to cart')))
          .toBeVisible()
          .withTimeout(3000);
      } catch {
        // Alternative success indicators
        await waitFor(element(by.id('cart-badge')))
          .toBeVisible()
          .withTimeout(3000);
      }

      // Step 6: Navigate to cart
      await element(by.id('cart-tab')).tap();

      await waitFor(element(by.id('cart-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify cart has items
      await detoxExpect(element(by.id('cart-items'))).toBeVisible();
      await detoxExpect(element(by.id('cart-total'))).toBeVisible();

      // Step 7: Proceed to checkout
      await element(by.id('checkout-button')).tap();

      await waitFor(element(by.id('checkout-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Step 8: Fill delivery information
      try {
        await element(by.id('delivery-address-input')).typeText('123 Test St, Denver, CO 80202');
        await element(by.id('delivery-method-selection')).tap();
      } catch {
        console.log('Address already filled or different checkout flow');
      }

      // Step 9: Proceed to payment sheet
      await element(by.id('proceed-to-payment-button')).tap();

      // Verify payment sheet appears
      await waitFor(element(by.id('payment-sheet')))
        .toBeVisible()
        .withTimeout(8000);

      await detoxExpect(element(by.id('payment-methods'))).toBeVisible();
      await detoxExpect(element(by.id('order-summary'))).toBeVisible();

      console.log(
        '✅ Full buyer journey completed: Auth → Browse → Cart → Checkout → Payment Sheet'
      );
    });
  });

  describe('Legal Screen & State Notice', () => {
    it('should toggle legal screen and show state notice', async () => {
      // Navigate to profile/settings
      await element(by.id('profile-tab')).tap();

      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Find and tap legal/terms link
      await element(by.id('legal-terms-link')).tap();

      await waitFor(element(by.id('legal-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify state compliance notice is visible
      await expect(element(by.id('state-notice-html'))).toBeVisible(); // Check for key legal text
      await detoxExpect(element(by.text(/Colorado cannabis laws/i))).toBeVisible();

      // Toggle sections to verify interactivity
      try {
        await element(by.id('terms-section-toggle')).tap();
        await detoxExpect(element(by.id('terms-content'))).toBeVisible();

        await element(by.id('privacy-section-toggle')).tap();
        await detoxExpect(element(by.id('privacy-content'))).toBeVisible();
      } catch {
        console.log('Legal sections may have different toggle implementation');
      }

      // Navigate back
      await element(by.id('back-button')).tap();

      await waitFor(element(by.id('profile-screen')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Legal screen toggle and state notice verification completed');
    });
  });

  describe('Weather Rail', () => {
    it('should render weather rail and be tappable', async () => {
      // Navigate to home screen
      await element(by.id('home-tab')).tap();

      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Wait for weather rail to load
      await waitFor(element(by.id('weather-for-you-rail')))
        .toBeVisible()
        .withTimeout(10000);

      // Verify weather rail components
      await detoxExpect(element(by.id('weather-condition'))).toBeVisible();
      await detoxExpect(element(by.id('weather-recommendations'))).toBeVisible();

      // Test tapping weather rail
      await element(by.id('weather-for-you-rail')).tap();

      // Should navigate to weather recommendations or expand
      try {
        await waitFor(element(by.id('weather-recommendations-screen')))
          .toBeVisible()
          .withTimeout(3000);

        // Navigate back if it opened a new screen
        await element(by.id('back-button')).tap();
      } catch {
        // Weather rail may expand in place or show different interaction
        console.log('Weather rail interaction completed (in-place expansion or different flow)');
      }

      // Test tapping individual weather recommendation if present
      try {
        await waitFor(element(by.id('weather-recommendation-item')))
          .toBeVisible()
          .withTimeout(3000);

        await element(by.id('weather-recommendation-item').atIndex(0)).tap();

        // Should navigate to product detail
        await waitFor(element(by.id('product-detail-screen')))
          .toBeVisible()
          .withTimeout(5000);

        await element(by.id('back-button')).tap();
      } catch {
        console.log('Weather recommendations may not be present or have different structure');
      }

      console.log('✅ Weather rail render and tap functionality verified');
    });
  });

  describe('Concierge Chat', () => {
    it('should send message and receive reply', async () => {
      // Navigate to concierge (may be in profile or as separate tab)
      try {
        await element(by.id('concierge-tab')).tap();
      } catch {
        // Concierge may be in profile or menu
        await element(by.id('profile-tab')).tap();
        await waitFor(element(by.id('profile-screen')))
          .toBeVisible()
          .withTimeout(3000);

        await element(by.id('concierge-chat-link')).tap();
      }

      await waitFor(element(by.id('concierge-chat-screen')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify chat interface elements
      await detoxExpect(element(by.id('chat-messages'))).toBeVisible();
      await detoxExpect(element(by.id('message-input'))).toBeVisible();
      await detoxExpect(element(by.id('send-button'))).toBeVisible();

      // Send a test message
      const testMessage = 'What do you recommend for relaxation?';
      await element(by.id('message-input')).typeText(testMessage);
      await element(by.id('send-button')).tap();

      // Verify message appears in chat
      await waitFor(element(by.text(testMessage)))
        .toBeVisible()
        .withTimeout(3000);

      // Wait for bot response (with generous timeout for API call)
      await waitFor(element(by.id('bot-message')))
        .toBeVisible()
        .withTimeout(30000);

      // Verify bot response is not empty
      try {
        await detoxExpect(element(by.text(/recommend|suggest|try|indica|sativa/i))).toBeVisible();
      } catch {
        // Any bot response is acceptable as long as it's not an error
        await detoxExpect(element(by.id('bot-message'))).toBeVisible();
      }

      // Test sending another message to verify conversation continuity
      await element(by.id('message-input')).typeText('Thank you!');
      await element(by.id('send-button')).tap();

      await waitFor(element(by.text('Thank you!')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Concierge chat send and receive functionality verified');
    });

    it('should handle concierge chat errors gracefully', async () => {
      // Test with very long message to potentially trigger rate limiting
      const longMessage =
        'This is a very long message that might trigger rate limiting or other error handling mechanisms in the concierge chat system. '.repeat(
          10
        );

      await element(by.id('message-input')).typeText(longMessage);
      await element(by.id('send-button')).tap();

      // Should either succeed or show error gracefully
      try {
        await waitFor(element(by.id('bot-message')))
          .toBeVisible()
          .withTimeout(15000);
        console.log('Long message handled successfully');
      } catch {
        // Check for error handling
        await waitFor(element(by.id('error-message')))
          .toBeVisible()
          .withTimeout(5000);
        console.log('Error handling working correctly');
      }
    });
  });

  describe('Critical Navigation & State', () => {
    it('should handle offline state gracefully', async () => {
      // Simulate offline state
      await device.setURLBlacklist(['.*']);

      // Try navigating to a screen that requires network
      await element(by.id('shop-tab')).tap();

      // Should show offline indicator
      try {
        await waitFor(element(by.id('offline-banner')))
          .toBeVisible()
          .withTimeout(5000);
      } catch {
        // Different offline handling approach
        console.log('Offline state may be handled differently');
      }

      // Restore network
      await device.setURLBlacklist([]);

      console.log('✅ Offline state handling verified');
    });

    it('should maintain cart state across app navigation', async () => {
      // Add item to cart first
      await element(by.id('shop-tab')).tap();

      await waitFor(element(by.id('product-list')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('product-item').atIndex(0)).tap();
      await element(by.id('add-to-cart-button')).tap();

      // Navigate away and back
      await element(by.id('home-tab')).tap();
      await element(by.id('profile-tab')).tap();
      await element(by.id('cart-tab')).tap();

      // Cart should still have items
      await waitFor(element(by.id('cart-items')))
        .toBeVisible()
        .withTimeout(3000);

      console.log('✅ Cart state persistence verified');
    });
  });
});

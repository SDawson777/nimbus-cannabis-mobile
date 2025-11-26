import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { addPaymentMethod } from '../../clients/paymentClient';
import AddPaymentScreen from '../../screens/AddPaymentScreen';
import { toast } from '../../utils/toast';

jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children }: any) => React.createElement('View', null, children),
    Text: ({ children }: any) => React.createElement('Text', null, children),
    SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children),
    TextInput: ({ onChangeText, value, ...props }: any) =>
      React.createElement('TextInput', { onChangeText, value, ...props }),
    Pressable: ({ children, onPress }: any) =>
      React.createElement('Pressable', { onClick: onPress }, children),
    ActivityIndicator: () => React.createElement('ActivityIndicator'),
    StyleSheet: { create: (s: any) => s },
    LayoutAnimation: { configureNext: jest.fn(), Presets: { easeInEaseOut: {} } },
    UIManager: { setLayoutAnimationEnabledExperimental: jest.fn() },
    Platform: { OS: 'ios' },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../utils/haptic', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
}));

jest.mock('../../clients/paymentClient');
jest.mock('../../utils/toast', () => ({ toast: jest.fn() }));
jest.mock('lucide-react-native', () => ({ ChevronLeft: () => null }));

jest.mock('../../context/ThemeContext', () => {
  const React = require('react');
  return {
    ThemeContext: React.createContext({
      colorTemp: 'neutral',
      brandPrimary: '#000',
      brandSecondary: '#888',
      brandBackground: '#FFF',
    }),
  };
});

describe('AddPaymentScreen form', () => {
  async function render() {
    const client = new QueryClient();
    jest.spyOn(client, 'invalidateQueries');
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <QueryClientProvider client={client}>
          <AddPaymentScreen />
        </QueryClientProvider>
      );
    });
    return { tree: tree!, client };
  }

  it('submits valid data', async () => {
    (addPaymentMethod as jest.Mock).mockResolvedValue({});
    const { tree, client } = await render();
    const inputs = tree.root.findAllByType('TextInput' as any);
    await act(async () => {
      // holderName, cardBrand, cardLast4, expiry
      inputs[0].props.onChangeText('John Doe');
      inputs[1].props.onChangeText('Visa');
      inputs[2].props.onChangeText('4242');
      inputs[3].props.onChangeText('12/30');
    });
    const button = tree.root.findAllByType('Pressable' as any).slice(-1)[0];
    await act(async () => {
      button.props.onClick();
    });
    expect(addPaymentMethod).toHaveBeenCalledWith({
      holderName: 'John Doe',
      cardBrand: 'Visa',
      cardLast4: '4242',
      expiry: '12/30',
      isDefault: false,
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['paymentMethods'] });
  });

  it('shows validation errors', async () => {
    const { tree } = await render();
    const button = tree.root.findAllByType('Pressable' as any).slice(-1)[0];
    await act(async () => {
      button.props.onClick();
    });
    const texts = tree.root
      .findAllByType('Text' as any)
      .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children));
    // new validation messages
    expect(texts).toContain('Card brand is required');
  });

  it('shows toast on api error', async () => {
    (addPaymentMethod as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    // clear prior toast calls from other tests
    (toast as jest.Mock).mockClear();
    const { tree } = await render();
    const inputs = tree.root.findAllByType('TextInput' as any);
    await act(async () => {
      // holderName, cardBrand, cardLast4, expiry
      inputs[0].props.onChangeText('John Doe');
      inputs[1].props.onChangeText('Visa');
      inputs[2].props.onChangeText('4242');
      inputs[3].props.onChangeText('12/30');
    });
    const button = tree.root.findAllByType('Pressable' as any).slice(-1)[0];
    await act(async () => {
      button.props.onClick();
    });
    expect(toast).toHaveBeenCalledWith('Unable to save payment method. Please try again.');
  });
});

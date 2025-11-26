import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { phase4Client } from '../../api/phase4Client';
import EditAddressScreen from '../../screens/EditAddressScreen';
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
  useRoute: () => ({
    params: {
      address: {
        id: 'addr-1',
        fullName: 'Jane Doe',
        phone: '555-555-5555',
        line1: 'Old',
        city: 'X',
        state: 'Y',
        zipCode: '00000',
        country: 'US',
        isDefault: true,
      },
    },
  }),
}));

jest.mock('../../utils/haptic', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
}));

jest.mock('../../api/phase4Client');
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

describe('EditAddressScreen form', () => {
  async function render() {
    const client = new QueryClient();
    jest.spyOn(client, 'invalidateQueries');
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <QueryClientProvider client={client}>
          <EditAddressScreen />
        </QueryClientProvider>
      );
    });
    return { tree: tree!, client };
  }

  it('updates address and invalidates', async () => {
    (phase4Client.put as jest.Mock).mockResolvedValue({ data: {} });
    const { tree, client } = await render();
    const inputs = tree.root.findAllByType('TextInput' as any);
    await act(async () => {
      // fill updated fields matching new schema
      inputs[0].props.onChangeText('Jane Doe Updated'); // fullName
      inputs[1].props.onChangeText('666-666-6666'); // phone
      inputs[2].props.onChangeText('New St'); // line1
      inputs[3].props.onChangeText('City'); // city
      inputs[4].props.onChangeText('ST'); // state
      inputs[5].props.onChangeText('11111'); // zipCode
      inputs[6].props.onChangeText('US'); // country
    });
    const button = tree.root.findAllByType('Pressable' as any).slice(-1)[0];
    await act(async () => {
      await button.props.onClick();
    });
    expect(phase4Client.put).toHaveBeenCalledWith('/addresses/addr-1', expect.any(Object));
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['addresses'] });
    expect(toast).toHaveBeenCalledWith('Address saved');
  });

  it('shows toast on api error', async () => {
    (phase4Client.put as jest.Mock).mockRejectedValue(new Error('fail'));
    const { tree } = await render();
    const button = tree.root.findAllByType('Pressable' as any).slice(-1)[0];
    await act(async () => {
      await button.props.onClick();
    });
    expect(toast).toHaveBeenCalled();
  });
});

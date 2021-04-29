import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';

import HomeScreen from '../screens/HomeScreen';
import GenerateMnemonicScreen from '../screens/GenerateMnemonicScreen';
import ConfirmMnemonicScreen from '../screens/ConfirmMnemonicScreen';
import RecoverWalletScreen from '../screens/RecoverWalletScreen';
import RevealMnemonicScreen from '../screens/RevealMnemonicScreen';
import RegisterScreen from '../screens/RegisterScreen';
import EndUserScreen from '../screens/EndUserScreen';

const navigationOptionsWallet = {
  title: 'Sacculus',
  headerBackTitle: 'Back',
};
const navigationOptionsHDA = {
  title: 'Blockchain Health Data Access',
};

const WalletNavigator = createStackNavigator(
  {
    Home: {screen: HomeScreen, navigationOptions: navigationOptionsWallet},
    GenerateMnemonic: {
      screen: GenerateMnemonicScreen,
      navigationOptions: navigationOptionsWallet,
    },
    ConfirmMnemonic: {
      screen: ConfirmMnemonicScreen,
      navigationOptions: navigationOptionsWallet,
    },
    RecoverWallet: {
      screen: RecoverWalletScreen,
      navigationOptions: navigationOptionsWallet,
    },
    RevealMnemonic: {
      screen: RevealMnemonicScreen,
      navigationOptions: navigationOptionsWallet,
    },
    Register: {
      screen: RegisterScreen,
      navigationOptions: navigationOptionsHDA,
    },
    EndUser: {
      screen: EndUserScreen,
      navigationOptions: navigationOptionsHDA,
    },
  },
  {
    initialRouteName: 'Home',
    headerLayoutPreset: 'center',
  },
);

export default createAppContainer(WalletNavigator);

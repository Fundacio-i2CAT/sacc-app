import React from 'react';
import {Provider} from 'react-redux';

import WalletNavigator from './navigation/WalletNavigator';
import {configureStore} from './store';
const store = configureStore();

const App = () => {
  return (
    <Provider store={store}>
      <WalletNavigator />
    </Provider>
  );
};

export default App;
import {createAppContainer} from 'react-navigation';
import {createDrawerNavigator} from 'react-navigation-drawer';

import PedingRequestsScreen from '../screens/PendingRequestsScreen';
import AcceptedRequestsScreen from '../screens/AcceptedRequestsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const literals = require('../literals/HDANavigation.json')['cat'];

const HDANavigator = createDrawerNavigator(
  {
    PendingRequests: {
      screen: PedingRequestsScreen,
      navigationOptions: {
        title: literals.pendingRequests,
      },
    },
    AcceptedRequests: {
      screen: AcceptedRequestsScreen,
      navigationOptions: {
        title: literals.acceptedRequests,
      },
    },
    Profile: {
      screen: ProfileScreen,
      navigationOptions: {
        title: literals.profile,
      },
    },
  },
  {
    initialRouteName: 'PendingRequests',
    contentOptions: {
      labelStyle: {
        color: 'purple',
      },
    },
  },
);

export default createAppContainer(HDANavigator);

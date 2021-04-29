import React from 'react';
import HDANavigation from '../navigation/HDANavigation';
import {Alert} from 'react-native';
import {StackActions, NavigationActions} from 'react-navigation';
import firebase from 'react-native-firebase';

const literals = require('../literals/EndUserScreen.json')['en'];

class EndUserScreen extends React.Component {
  async componentDidMount() {
    const {navigation} = this.props;
    const web3 = navigation.getParam('web3');
    const contract = navigation.getParam('contract');
    const acessedByUser = navigation.getParam('acessedByUser');

    if (!acessedByUser) {
      this.notificationListener = await firebase
        .notifications()
        .onNotification(notification => {
          const {title, body} = notification;
          Alert.alert(
            title,
            body,
            [
              {
                text: literals.notificationButton,
                onPress: () => {
                  const resetAction = StackActions.reset({
                    index: 0,
                    actions: [
                      NavigationActions.navigate({
                        routeName: 'EndUser',
                        params: {web3, contract},
                      }),
                    ],
                  });
                  this.props.navigation.dispatch(resetAction);
                },
              },
            ],
            {
              cancelable: false,
            },
          );
        });
    }
  }

  componentWillUnmount() {
    if (this.notificationListener) {
      this.notificationListener();
    }
  }

  render() {
    const {navigation} = this.props;
    const web3 = navigation.getParam('web3');
    const contract = navigation.getParam('contract');
    return <HDANavigation screenProps={{web3, contract}} />;
  }
}

export default EndUserScreen;

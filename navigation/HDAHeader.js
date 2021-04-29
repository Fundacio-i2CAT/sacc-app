import React from 'react';
import {View, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const HDAHeader = props => {
  return (
    <View style={styles.menu}>
      <Icon.Button
        name="md-menu"
        backgroundColor="white"
        color="purple"
        size={50}
        onPress={() => props.navigation.toggleDrawer()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  menu: {
    alignItems: 'flex-end',
  },
});

export default HDAHeader;

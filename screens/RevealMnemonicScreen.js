import React from 'react';
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  Button,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

const CryptoJS = require('crypto-js');

const literals = require('../literals/RevealMnemonicScreen')['en'];

const MnemonicItem = props => {
  const {word, index} = props;
  return (
    <>
      {index < 6 ? (
        <View style={styles.itemContainer}>
          <View style={styles.itemPair}>
            <Text style={word !== '' ? styles.itemNumber : null}>
              {word !== '' ? `${index + 1}` : ''}
            </Text>
            <Text style={word !== '' ? styles.item : null}>
              {word !== '' ? `${word}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.itemContainerReversed}>
          <View style={styles.itemPair}>
            <Text style={word !== '' ? styles.itemReversed : null}>
              {word !== '' ? `${word}` : ''}
            </Text>
            <Text style={word !== '' ? styles.itemNumberReversed : null}>
              {word !== '' ? `${index + 1}` : ''}
            </Text>
          </View>
        </View>
      )}
    </>
  );
};

const MnemonicGrid = props => {
  const {words} = props;
  return (
    <View style={styles.row}>
      <View style={styles.column}>
        {words.slice(0, 6).map((w, i) => (
          <MnemonicItem word={w} index={i} key={i} />
        ))}
      </View>
      <View style={styles.column}>
        {words.slice(6, 12).map((w, i) => (
          <MnemonicItem word={w} index={i + 6} key={i} />
        ))}
      </View>
    </View>
  );
};

class RevealMnemonicScreen extends React.Component {
  state = {password: '', mnemonic: []};

  handlePassword = async () => {
    const {password} = this.state;
    const cipheredMnemonic = await AsyncStorage.getItem('cipheredMnemonic');
    const decipheredMnemonic = CryptoJS.AES.decrypt(cipheredMnemonic, password);
    const mnemonic = decipheredMnemonic.toString(CryptoJS.enc.Utf8).split(' ');
    this.setState({mnemonic});
  };

  render() {
    const {password, mnemonic} = this.state;
    return (
      <View style={styles.mainContainer}>
        {mnemonic.length === 0 ? (
          <>
            <View style={styles.descriptionContainer}>
              <Text>{literals.introducePassword}</Text>
            </View>
            <TextInput
              style={styles.textInput}
              onChangeText={password => this.setState({password})}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            <View style={styles.revealButton}>
              <Button
                title={literals.revealButton}
                onPress={() => this.handlePassword()}
                color="orange"
                disabled={password === '' ? true : false}
              />
            </View>
          </>
        ) : (
          <>
            {mnemonic.length === 12 ? (
              <View>
                <ScrollView>
                  <MnemonicGrid words={mnemonic} />
                </ScrollView>
              </View>
            ) : (
              <View style={styles.descriptionContainer}>
                <Text>{literals.incorrectPassword}</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  }
}

const dimensions = Dimensions.get('window');
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  descriptionContainer: {
    alignSelf: 'center',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    width: 250,
    borderColor: 'purple',
    borderRadius: 10,
    marginTop: 20,
    textAlign: 'center',
    alignSelf: 'center',
    color: 'black'
  },
  revealButton: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  column: {
    flexDirection: 'column',
    paddingHorizontal: dimensions.width / 10,
  },
  item: {
    color: 'white',
    paddingRight: 10,
  },
  itemNumber: {
    backgroundColor: 'purple',
    color: 'orange',
    fontSize: 25,
    paddingRight: 10,
    paddingLeft: 5,
    paddingTop: Platform.OS === 'ios' ? 3 : 2,
    height: 40,
  },
  itemPair: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'purple',
    borderRadius: 30,
    height: 40,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemContainerReversed: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemReversed: {
    color: 'white',
    paddingLeft: 10,
  },
  itemNumberReversed: {
    backgroundColor: 'purple',
    color: 'orange',
    fontSize: 25,
    paddingLeft: 10,
    paddingRight: 5,
    paddingTop: Platform.OS === 'ios' ? 3 : 2,
    height: 40,
  },
});

export default RevealMnemonicScreen;

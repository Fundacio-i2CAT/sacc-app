import React from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {StackActions, NavigationActions} from 'react-navigation';
import AsyncStorage from '@react-native-community/async-storage';
import Tags from '../components/Tags';

const CryptoJS = require('crypto-js');

const literals = require('../literals/ConfirmMnemonicScreen')['en'];

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

class ConfirmMnemonicScreen extends React.Component {
  state = {
    mnemonic: [],
    shuffledMnemonic: [],
    wordsSelected: [],
    confirmed: '',
    password: '',
    passwordVerification: '',
    canFinish: false,
    isPasswordFormatCorrect: true,
    dimensions: Dimensions.get('window'),
  };

  componentDidMount() {
    const {navigation} = this.props;
    const mnemonic = navigation.getParam('mnemonic');
    const shuffledMnemonic = JSON.parse(JSON.stringify(mnemonic));
    for (let i = shuffledMnemonic.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = shuffledMnemonic[i];
      shuffledMnemonic[i] = shuffledMnemonic[j];
      shuffledMnemonic[j] = temp;
    }
    this.setState({mnemonic, shuffledMnemonic});
  }

  handleConfirmPassword = async () => {
    const {mnemonic, password} = this.state;
    if (!password.match(/^[0-9a-zA-Z]{8}[0-9a-zA-Z]*$/)) {
      this.setState({isPasswordFormatCorrect: false});
    } else {
      await AsyncStorage.setItem('mnemonic', JSON.stringify(mnemonic));
      const cipheredMnemonic = CryptoJS.AES.encrypt(
        mnemonic.join(' '),
        password,
      );
      await AsyncStorage.setItem(
        'cipheredMnemonic',
        cipheredMnemonic.toString(),
      );
      const resetAction = StackActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate({
            routeName: 'Home',
            params: {from: 'mnemonicCreation'},
          }),
        ],
      });
      this.props.navigation.dispatch(resetAction);
    }
  };

  handleConfirmMnemonic = () => {
    const {mnemonic, wordsSelected} = this.state;
    for (let i = mnemonic.length; i--; ) {
      if (mnemonic[i] !== wordsSelected[i]) {
        this.setState({confirmed: false});
        return;
      }
    }
    this.setState({confirmed: true});
  };

  handleResetMnemonic = () => {
    this.setState({wordsSelected: [], confirmed: ''});
  };

  handleIntroducePassword = password => {
    const {passwordVerification} = this.state;
    let canFinish = false;
    if (password !== '' && password === passwordVerification) {
      canFinish = true;
    }
    this.setState({password, canFinish});
  };

  handleIntroducePasswordVerification = passwordVerification => {
    const {password} = this.state;
    let canFinish = false;
    if (password !== '' && password === passwordVerification) {
      canFinish = true;
    }
    this.setState({passwordVerification, canFinish});
  };

  onTagPress = tagLabel => {
    const {wordsSelected} = this.state;
    wordsSelected.push(tagLabel);
    this.setState({wordsSelected});
  };

  onLayout = () => {
    this.setState({
      dimensions: Dimensions.get('window'),
    });
  };

  render() {
    const {
      shuffledMnemonic,
      wordsSelected,
      confirmed,
      canFinish,
      isPasswordFormatCorrect,
      dimensions,
    } = this.state;
    return shuffledMnemonic.length === 0 ? (
      <View
        onLayout={this.onLayout}
        style={[styles.mainContainer, {justifyContent: 'center'}]}>
        <Text style={styles.descriptionText}>{literals.loading}</Text>
      </View>
    ) : (
      <KeyboardAvoidingView
        onLayout={this.onLayout}
        style={styles.mainContainer}
        behavior="position"
        enabled>
        <ScrollView
          ref="scrollView"
          onContentSizeChange={(width, heigth) =>
            this.refs.scrollView.scrollTo({y: heigth, animated: true})
          }>
          <View
            style={{
              marginTop: dimensions.height / 20,
            }}>
            <Text style={{textAlign: 'center'}}>{literals.tapWords}</Text>
          </View>
          {wordsSelected.length < 12 && (
            <View style={{marginTop: dimensions.height / 40}}>
              <Tags
                initialTags={shuffledMnemonic}
                onTagPress={this.onTagPress.bind(this)}
                readOnly={false}
              />
            </View>
          )}
          {wordsSelected.length !== 0 && <MnemonicGrid words={wordsSelected} />}
          {wordsSelected.length === 12 && (
            <>
              {confirmed === false && (
                <View style={{marginTop: dimensions.height / 40}}>
                  <Button
                    onPress={this.handleResetMnemonic}
                    title={literals.resetButton}
                    color="orange"
                  />
                </View>
              )}
              <View
                style={{
                  marginTop: dimensions.height / 40,
                }}>
                <Button
                  onPress={this.handleConfirmMnemonic}
                  title={literals.confirmButton}
                  color="orange"
                />
              </View>
            </>
          )}
          {confirmed === false && (
            <View
              style={[
                styles.notification,
                {
                  marginHorizontal: dimensions.width / 20,
                  marginVertical: dimensions.height / 40,
                },
              ]}>
              <Text>{literals.verificationFailed}</Text>
            </View>
          )}
          {confirmed === true && (
            <>
              <View
                style={[
                  styles.notification,
                  {
                    marginHorizontal: dimensions.width / 20,
                    marginVertical: dimensions.height / 40,
                  },
                ]}>
                <Text>{literals.verificationSuccessful}</Text>
              </View>
              <Text style={{marginLeft: dimensions.width / 8}}>
                {literals.password}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    marginBottom: dimensions.height / 40,
                    width: (dimensions.width * 3) / 4,
                  },
                ]}
                onChangeText={p => this.handleIntroducePassword(p)}
                secureTextEntry={true}
                autoCapitalize="none"
              />
              <Text style={{marginLeft: dimensions.width / 8}}>
                {literals.repeatPassword}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    marginBottom: dimensions.height / 40,
                    width: (dimensions.width * 3) / 4,
                  },
                ]}
                onChangeText={pv =>
                  this.handleIntroducePasswordVerification(pv)
                }
                secureTextEntry={true}
                autoCapitalize="none"
              />
              {!isPasswordFormatCorrect && (
                <View style={styles.failureNotification}>
                  <Text>{literals.passwordVerificationFailed}</Text>
                </View>
              )}
              <Button
                onPress={this.handleConfirmPassword}
                title={literals.finishButton}
                color="orange"
                disabled={!canFinish}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

const dimensions = Dimensions.get('window');
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  descriptionText: {
    textAlign: 'center',
  },
  notification: {
    backgroundColor: 'orange',
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    paddingTop: 10,
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
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: 'purple',
    borderRadius: 10,
    textAlign: 'center',
    alignSelf: 'center',
    color: 'black',
  },
});

export default ConfirmMnemonicScreen;

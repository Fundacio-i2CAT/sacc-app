import React from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import {StackActions, NavigationActions} from 'react-navigation';
import AsyncStorage from '@react-native-community/async-storage';
import {ScrollView} from 'react-native-gesture-handler';

const literals = require('../literals/RecoverWalletScreen.json')['en'];
const CryptoJS = require('crypto-js');

const MnemonicItem = props => {
  const {confirmedWord, index} = props;
  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemPair}>
        <Text style={confirmedWord !== '' ? styles.itemNumber : null}>
          {confirmedWord !== '' ? `${index + 1}` : ''}
        </Text>
        <Text style={confirmedWord !== '' ? styles.item : null}>
          {confirmedWord !== '' ? `${confirmedWord}` : ''}
        </Text>
      </View>
    </View>
  );
};

const MnemonicGrid = props => {
  const {confirmedWords} = props;
  return (
    <View style={{minHeight: (props.dimensions.height * 45) / 100}}>
      <View style={[styles.row, {paddingTop: props.dimensions.height / 40}]}>
        <View
          style={
            ([styles.column], {paddingHorizontal: props.dimensions.width / 40})
          }>
          {confirmedWords.slice(0, 4).map((w, i) => (
            <MnemonicItem confirmedWord={w} index={i} key={i} />
          ))}
        </View>
        <View
          style={[
            styles.column,
            {paddingHorizontal: props.dimensions.width / 40},
          ]}>
          {confirmedWords.slice(4, 8).map((w, i) => (
            <MnemonicItem confirmedWord={w} index={i + 4} key={i} />
          ))}
        </View>
        <View
          style={
            (styles.column, {paddingHorizontal: props.dimensions.width / 40})
          }>
          {confirmedWords.slice(8, 12).map((w, i) => (
            <MnemonicItem confirmedWord={w} index={i + 8} key={i} />
          ))}
        </View>
      </View>
    </View>
  );
};

class RecoverWalletScreen extends React.Component {
  state = {
    wordsIntroduced: [],
    confirmedWords: [],
    currentWordIndex: 0,
    currentWord: '',
    dimensions: Dimensions.get('window'),
    confirmed: false,
    password: '',
    passwordVerification: '',
    canFinish: false,
    isPasswordFormatCorrect: true,
  };

  handleSetWord = (word, index) => {
    const {wordsIntroduced} = this.state;
    wordsIntroduced[index] = word.toLowerCase();
    this.setState({wordsIntroduced, currentWord: word});
  };

  handleContinue = () => {
    const {confirmedWords, currentWordIndex, currentWord} = this.state;
    confirmedWords[currentWordIndex] = currentWord
      .toLowerCase()
      .trim()
      .replace('.', '');
    this.setState({
      confirmedWords,
      currentWordIndex: currentWordIndex + 1,
      currentWord: '',
    });
  };

  handleBack = () => {
    const {confirmedWords, currentWordIndex} = this.state;
    confirmedWords[currentWordIndex - 1] = '';
    this.setState({
      confirmedWords,
      currentWordIndex: currentWordIndex - 1,
      currentWord: '',
    });
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

  handleRecoverMnemonic = async () => {
    const {wordsIntroduced, password} = this.state;
    if (!password.match(/^[0-9a-zA-Z]{8}[0-9a-zA-Z]*$/)) {
      this.setState({isPasswordFormatCorrect: false});
    } else {
      await AsyncStorage.setItem('mnemonic', JSON.stringify(wordsIntroduced));
      const cipheredMnemonic = CryptoJS.AES.encrypt(
        wordsIntroduced.join(' '),
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

  onLayout = () => {
    this.setState({
      dimensions: Dimensions.get('window'),
    });
  };

  render() {
    const {
      confirmedWords,
      currentWordIndex,
      currentWord,
      confirmed,
      isPasswordFormatCorrect,
      canFinish,
      dimensions,
    } = this.state;
    return (
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <SafeAreaView onLayout={this.onLayout} style={styles.mainContainer}>
          <View>
            <ScrollView>
              {!confirmed && (
                <Text style={styles.descriptionContainer}>
                  {currentWordIndex < 12
                    ? `${literals.introduceMnemonic1} ${literals.order[currentWordIndex]} ${literals.introduceMnemonic2}`
                    : `${literals.confirmMnemonic}`}
                </Text>
              )}
              {currentWordIndex < 12 && (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      width: (dimensions.width * 3) / 4,
                      marginTop: dimensions.height / 40,
                    },
                  ]}
                  onChangeText={word =>
                    this.handleSetWord(word, currentWordIndex)
                  }
                  value={currentWord}
                  autoCapitalize="none"
                />
              )}
              {currentWordIndex > 0 && !confirmed && (
                <>
                  {currentWordIndex < 12 && (
                    <View
                      style={[
                        styles.dividingLine,
                        {
                          paddingTop: dimensions.height / 20,
                          marginHorizontal: dimensions.width / 20,
                        },
                      ]}
                    />
                  )}
                  <MnemonicGrid
                    confirmedWords={confirmedWords}
                    dimensions={dimensions}
                  />
                </>
              )}
              {currentWordIndex == 12 && confirmed && (
                <>
                  {isPasswordFormatCorrect ? (
                    <View style={styles.notification}>
                      <Text>{literals.notificationPassword}</Text>
                    </View>
                  ) : (
                    <View style={styles.notification}>
                      <Text>{literals.notificationPasswordFailed}</Text>
                    </View>
                  )}
                  <Text style={{paddingLeft: dimensions.width / 8}}>
                    {literals.password}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        width: (dimensions.width * 3) / 4,
                        marginBottom: dimensions.height / 40,
                      },
                    ]}
                    onChangeText={p => this.handleIntroducePassword(p)}
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                  <Text style={{paddingLeft: dimensions.width / 8}}>
                    {literals.repeatPassword}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        width: (dimensions.width * 3) / 4,
                        marginBottom: dimensions.height / 30,
                      },
                    ]}
                    onChangeText={pv =>
                      this.handleIntroducePasswordVerification(pv)
                    }
                    secureTextEntry={true}
                    autoCapitalize="none"
                  />
                </>
              )}
              <View style={currentWordIndex > 0 ? styles.buttons : null}>
                {currentWordIndex > 0 && !confirmed && (
                  <Button
                    title="< BACK"
                    color="orange"
                    onPress={() => this.handleBack()}
                  />
                )}
                {currentWordIndex < 12 ? (
                  <View
                    style={{
                      marginTop: dimensions.height / 40,
                    }}>
                    <Button
                      title={literals.continueButton}
                      color="orange"
                      onPress={() => this.handleContinue()}
                      disabled={currentWord.trim() !== '' ? false : true}
                    />
                  </View>
                ) : (
                  <>
                    {!confirmed && (
                      <View
                        style={{
                          marginTop: dimensions.height / 40,
                        }}>
                        <Button
                          title={literals.confirmButton}
                          color="orange"
                          onPress={() => this.setState({confirmed: true})}
                        />
                      </View>
                    )}
                    {confirmed && (
                      <>
                        <Button
                          title={literals.backButton}
                          color="orange"
                          onPress={() => this.setState({confirmed: false})}
                        />
                        <View
                          style={{
                            marginTop: dimensions.height / 40,
                          }}>
                          <Button
                            title={literals.finishButton}
                            color="orange"
                            onPress={() => this.handleRecoverMnemonic()}
                            disabled={!canFinish}
                          />
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  descriptionContainer: {
    textAlign: 'center',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: 'purple',
    borderRadius: 10,
    textAlign: 'center',
    alignSelf: 'center',
    color: 'black'
  },
  dividingLine: {
    borderBottomColor: 'grey',
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  column: {
    flexDirection: 'column',
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
    padding: 5,
    paddingBottom: 15,
  },
  notification: {
    backgroundColor: 'orange',
    padding: 20,
    marginTop: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
});

export default RecoverWalletScreen;

import React from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Modal,
  ScrollView,
  Clipboard,
} from 'react-native';
import {
  withNavigation,
  StackActions,
  NavigationActions,
} from 'react-navigation';
import {connect} from 'react-redux';
import {updateCircuitAsync} from '../store/actions';
import AsyncStorage from '@react-native-community/async-storage';
import axios from 'axios';
import Web3 from 'web3';
import contractAbi from '../contracts/abi';
import bip39 from 'react-native-bip39';
import HDKey from 'hdkey';
import firebase from 'react-native-firebase';
import logo from '../assets/img/logo-color-vector.png';
import saluscoopImage from '../assets/img/saluscoop.png';
import {TouchableOpacity} from 'react-native-gesture-handler';

const ethUtil = require('ethereumjs-util');
const CONFIG = require('../config.json');

const literals = require('../literals/HomeScreen.json')['en'];

class HomeScreen extends React.Component {
  state = {
    isLoading: true,
    loginPerformed: false,
    web3: null,
    contract: null,
    wallet: null,
    ethereumAddress: null,
    privateKey: null,
    role: null,
    logoutModalVisible: false,
    balance: 0,
    ethToEuro: null,
    dimensions: Dimensions.get('window'),
    orientation:
      Dimensions.get('window').width < Dimensions.get('window').height
        ? 'portrait'
        : 'landscape',
  };

  async componentDidMount() {
    try {
      const enabled = await firebase.messaging().hasPermission();
      if (enabled) {
        const firebaseCloudToken = await firebase.messaging().getToken();
        await AsyncStorage.setItem('firebaseCloudToken', firebaseCloudToken);
        this.messageListener = firebase.messaging().onMessage(message => {
          console.log(message);
        });
        this.notificationListener = await firebase
          .notifications()
          .onNotification(notification => {
            const {title, body} = notification;
            Alert.alert(
              title,
              body,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    const {web3, contract} = this.state;
                    const resetAction = StackActions.reset({
                      index: 0,
                      actions: [
                        NavigationActions.navigate({
                          routeName: 'EndUser',
                          params: {web3, contract},
                        }),
                      ],
                    });
                    this.notificationListener();
                    this.props.navigation.dispatch(resetAction);
                  },
                },
              ],
              {
                cancelable: false,
              },
            );
          });
        const notificationOpen = await firebase
          .notifications()
          .getInitialNotification();
        if (notificationOpen) {
          const {web3, contract} = this.state;
          const resetAction = StackActions.reset({
            index: 0,
            actions: [
              NavigationActions.navigate({
                routeName: 'EndUser',
                params: {web3, contract},
              }),
            ],
          });
          this.notificationListener();
          this.props.navigation.dispatch(resetAction);
        }
      } else {
        firebase
          .messaging()
          .requestPermission()
          .then(() => {
            this.messageListener = firebase.messaging().onMessage(message => {
              Alert.alert(message, null, [{text: 'OK', onPress: () => {}}], {
                cancelable: false,
              });
            });
          });
      }
    } catch (err) {
      console.log(err);
    }

    this.props.updateCircuitAsync();

    try {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(CONFIG.ethereumRPCURL),
      );
      const contract = new web3.eth.Contract(
        contractAbi,
        CONFIG.contractAddress,
      );
      let ethereumAddress = null;
      let privateKey = null;
      let balance = 0;
      let ethToEuro = null;
      const wallet = await AsyncStorage.getItem('mnemonic');
      if (wallet !== null) {
        const mnemonic = JSON.parse(wallet).join(' ');
        const seed = bip39.mnemonicToSeed(mnemonic);
        const root = HDKey.fromMasterSeed(new Buffer(seed, 'hex'));
        const addressNode = root.derive("m/44'/60'/0'/0/0");
        const publicKey = ethUtil.privateToPublic(addressNode.privateKey);
        const address = ethUtil.publicToAddress(publicKey).toString('hex');
        ethereumAddress = ethUtil.toChecksumAddress(address);
        privateKey = `0x${addressNode.privateKey.toString('hex')}`;
        balance = web3.utils.fromWei(
          await web3.eth.getBalance(ethereumAddress),
          'ether',
        );
        const instance = axios.create();
        ethToEuro = await instance.get(
          `https://min-api.cryptocompare.com/data/price?api_key=53f1112226041ff867db31ac0d783fc4124d97a5f85d06710cfc0ce13c811390&fsym=ETH&tsyms=EUR`,
        );
        typeof ethToEuro.data.EUR === 'number'
          ? (ethToEuro = ethToEuro.data.EUR)
          : (ethToEuro = null);
        await AsyncStorage.setItem('address', ethereumAddress);
        await AsyncStorage.setItem('privateKey', privateKey);
      }
      this.setState({
        isLoading: false,
        web3,
        contract,
        wallet,
        ethereumAddress,
        privateKey,
        balance,
        ethToEuro,
      });
    } catch (error) {
      console.log(error);
    }
  }

  componentWillUnmount() {
    if (this.messageListener) {
      this.messageListener();
    }
    if (this.notificationListener) {
      this.notificationListener();
    }
  }

  handleLogout = async () => {
    this.setState({logoutModalVisible: true});
  };

  handleClearStorage = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await instance.put(`${CONFIG.backendURL}/user`, {
        asleep: true,
      });
      await AsyncStorage.clear();
      this.setState({wallet: null, logoutModalVisible: false});
    } catch (err) {
      console.log(err);
    }
  };

  sign = async challenge => {
    const {web3, ethereumAddress, privateKey} = this.state;
    // Build the signature using utils.soliditySha3 using address
    //  as CHALLENGE plus uint256 NONCE corresponding to timestamp
    const hash = web3.utils.soliditySha3(
      {t: 'address', v: ethereumAddress},
      {t: 'uint256', v: challenge.toString()},
    );
    // Using Web3 eth.accounts method to sign using privateKey as string
    const signature = await web3.eth.accounts.sign(hash, privateKey);
    return signature;
  };

  handleHDALogin = async () => {
    const {web3, contract, ethereumAddress} = this.state;
    const challenge = await axios.post(`${CONFIG.backendURL}/login`, {
      address: ethereumAddress,
    });
    const signature = await this.sign(challenge.data.challenge);
    const response = await axios.post(`${CONFIG.backendURL}/login`, {
      address: ethereumAddress,
      signature: signature,
    });
    const role = await contract.methods.userRoles(ethereumAddress).call();
    const token = response.data.accessToken;
    await AsyncStorage.setItem('accessToken', token);
    const firebaseCloudToken = await AsyncStorage.getItem('firebaseCloudToken');
    const instance = axios.create();
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await instance.put(`${CONFIG.backendURL}/user`, {firebaseCloudToken});
    switch (role) {
      case '0':
        this.props.navigation.navigate('Register');
        break;
      case '1':
        const acessedByUser = true;
        this.props.navigation.navigate('EndUser', {
          web3,
          contract,
          acessedByUser,
        });
        break;
      default:
        this.props.navigation.navigate('Register');
    }
  };

  onLayout = () => {
    let orientation = 'landscape';
    if (Dimensions.get('window').width < Dimensions.get('window').height) {
      orientation = 'portrait';
    }
    this.setState({
      dimensions: Dimensions.get('window'),
      orientation,
    });
  };

  render() {
    const {
      isLoading,
      logoutModalVisible,
      wallet,
      ethereumAddress,
      balance,
      ethToEuro,
      dimensions,
      orientation,
    } = this.state;
    return isLoading ? (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <Text style={styles.text}>{literals.loadingWallet}</Text>
        <View style={styles.spinners}>
          <ActivityIndicator size="large" color="purple" />
        </View>
      </View>
    ) : (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <Modal
          visible={logoutModalVisible}
          transparent={false}
          animationType="slide">
          <View style={styles.popup}>
            <Text style={[styles.text, {marginBottom: 15}]}>
              {literals.modalLogingOut}
            </Text>
            <View style={styles.popupButton}>
              <Button
                title="Logout"
                onPress={() => {
                  this.setState(this.handleClearStorage);
                }}
                color="orange"
              />
            </View>
            <View style={styles.popupButton}>
              <Button
                title="Cancel"
                onPress={() => {
                  this.setState({logoutModalVisible: false});
                }}
                color="orange"
              />
            </View>
          </View>
        </Modal>
        {wallet !== null && (
          <ScrollView>
            <View style={styles.subheader}>
              <Text style={styles.subheaderText}>{literals.welcomeWallet}</Text>
            </View>
            <View style={styles.balance}>
              <Text>Your balance is:</Text>
              {ethToEuro !== null ? (
                <Text>{`${balance} ETH | ${Math.round(
                  balance * ethToEuro * 100,
                ) / 100} EUR`}</Text>
              ) : (
                <Text>{`${balance} ETH`}</Text>
              )}
            </View>
            <Text style={styles.subtitle}>{literals.chooseService}</Text>
            <View
              style={[
                styles.appsRow,
                {marginHorizontal: dimensions.width / 50},
              ]}>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <TouchableOpacity onPress={this.handleHDALogin}>
                  <>
                    <Text
                      style={[
                        styles.appsText,
                        {
                          paddingTop: dimensions.height / 50,
                          paddingHorizontal: dimensions.height / 100,
                        },
                      ]}>
                      {literals.saluscoopService}
                    </Text>
                    <Image
                      source={saluscoopImage}
                      style={[
                        styles.saluscoopImage,
                        {
                          width:
                            orientation === 'portrait'
                              ? dimensions.width / 8
                              : dimensions.width / 6,
                          height:
                            orientation === 'portrait'
                              ? dimensions.height / 16
                              : dimensions.height / 4,
                          marginTop:
                            orientation === 'portrait'
                              ? dimensions.height / 200
                              : dimensions.height / 50,
                          marginBottom:
                            orientation === 'portrait'
                              ? dimensions.height / 50
                              : 0,
                        },
                      ]}
                    />
                  </>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <Text
                  style={[
                    styles.appsText,
                    {
                      paddingTop: dimensions.height / 50,
                      paddingHorizontal: dimensions.height / 100,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <Text style={styles.appsText} />
              </View>
            </View>
            <View
              style={[
                styles.appsRow,
                {marginHorizontal: dimensions.width / 50},
              ]}>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <Text
                  style={[
                    styles.appsText,
                    {
                      paddingTop: dimensions.height / 50,
                      paddingHorizontal: dimensions.height / 100,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <Text
                  style={[
                    styles.appsText,
                    {
                      paddingTop: dimensions.height / 50,
                      paddingHorizontal: dimensions.height / 100,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.appsElement,
                  {
                    height: (3 * dimensions.width) / 10,
                    width: (3 * dimensions.width) / 10,
                    margin: dimensions.width / 100,
                  },
                ]}>
                <Text
                  style={[
                    styles.appsText,
                    {
                      paddingTop: dimensions.height / 50,
                      paddingHorizontal: dimensions.height / 100,
                    },
                  ]}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(ethereumAddress);
                alert('Address copied to Clipboard!');
              }}
              style={styles.button}>
              <Text style={styles.buttonText}>
                {literals.copyAddressButton}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => this.props.navigation.navigate('RevealMnemonic')}
              style={styles.button}>
              <Text style={styles.buttonText}>
                {literals.revealMnemonicButton}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.handleLogout} style={styles.button}>
              <Text style={styles.buttonText}>{literals.logoutButton}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
        {wallet === null && (
          <View style={{justifyContent: 'center'}}>
            <ScrollView>
              <Image
                source={logo}
                style={[
                  styles.logo,
                  {
                    width:
                      orientation === 'portrait'
                        ? dimensions.width
                        : (dimensions.width * 3) / 2,
                    height:
                      orientation === 'portrait'
                        ? (dimensions.height * 2) / 10
                        : dimensions.height / 2,
                    marginTop: dimensions.width / 20,
                    marginBottom: dimensions.width / 20,
                  },
                ]}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() =>
                  this.props.navigation.navigate('GenerateMnemonic')
                }
                style={styles.button}>
                <Text style={styles.buttonText}>
                  {literals.createWalletButton}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => this.props.navigation.navigate('RecoverWallet')}
                style={styles.button}>
                <Text style={styles.buttonText}>
                  {literals.recoverWalletButton}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  popup: {
    flex: 1,
    justifyContent: 'center',
  },
  popupButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  spinners: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: 30,
  },
  logo: {
    alignSelf: 'center',
  },
  button: {
    backgroundColor: 'orange',
    height: 50,
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: {color: 'white', textAlign: 'center'},
  appsRow: {flexDirection: 'row'},
  appsElement: {
    backgroundColor: 'purple',
    justifyContent: 'center',
  },
  appsText: {
    color: 'white',
    textAlign: 'center',
  },
  saluscoopImage: {
    alignSelf: 'center',
    tintColor: 'white',
  },
  subheader: {
    backgroundColor: 'black',
    height: 50,
    justifyContent: 'center',
  },
  subheaderText: {color: 'white', textAlign: 'center', fontSize: 18},
  subtitle: {textAlign: 'center', marginBottom: 5},
  balance: {
    alignItems: 'center',
    marginVertical: 5,
  },
});

export default connect(
  null,
  {updateCircuitAsync},
)(withNavigation(HomeScreen));

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import {connect} from 'react-redux';
import {CheckBox} from 'react-native-elements';
import HDAHeader from '../navigation/HDAHeader';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import {WebView} from 'react-native-webview';
import RNRestart from 'react-native-restart';

const bigInt = require('big-integer');
const Tx = require('ethereumjs-tx').Transaction;

const CONFIG = require('../config.json');
const literals = require('../literals/ProfileScreen.json')['cat'];

class ProfileScreen extends React.Component {
  state = {
    isLoading: true,
    isEditing: false,
    isEditingTopics: false,
    isGeneratingProof: false,
    topicsEdited: false,
    isUnregistering: false,
    isProcessing: false,
    topics: [],
    userTopics: [],
    siblings: [],
    root: null,
    form: ['', '', '', ''],
    firstName: null,
    surnames: null,
    email: null,
    phone: null,
    address: null,
    errorStatus: null,
    input: {},
    dimensions: Dimensions.get('window'),
    web3: null,
    contract: null,
  };

  async componentDidMount() {
    const web3 = this.props.screenProps.web3;
    const contract = this.props.screenProps.contract;
    const token = await AsyncStorage.getItem('accessToken');
    const instance = axios.create();
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const response = await instance.get(`${CONFIG.backendURL}/user`);
    const firstName = response.data.firstName;
    const surnames = response.data.surnames;
    const email = response.data.email;
    const phone = response.data.phone;
    const address = response.data.address;
    const form = [surnames, firstName, email, phone];
    const siblings = await instance.get(`${CONFIG.backendURL}/siblings`);
    const topics = await instance.get(`${CONFIG.backendURL}/topic`);
    let userTopics = (await AsyncStorage.getItem('userTopics')) || [];
    userTopics.length !== 0
      ? (userTopics = userTopics.replace(/\"/g, '').split('_'))
      : userTopics;
    this.setState({
      isLoading: false,
      firstName,
      surnames,
      email,
      phone,
      address,
      form: form,
      topics: topics.data.topics,
      userTopics,
      siblings: siblings.data.siblings,
      root: siblings.data.root,
      dimensions: Dimensions.get('window'),
      web3,
      contract,
    });
  }

  handleFormInput = (data, index) => {
    const {form} = this.state;
    form[index] = data;
    this.setState({form});
  };

  handleSubmit = async () => {
    const {form} = this.state;
    try {
      if (!form[3].match(/^\+34\d{9}$/)) {
        this.setState({
          errorStatus: 'errorPhoneNumber',
        });
        return;
      }
      const token = await AsyncStorage.getItem('accessToken');
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await instance.put(`${CONFIG.backendURL}/user`, {
        surnames: form[0],
        firstName: form[1],
        email: form[2],
        phone: form[3],
      });
      this.setState({
        isEditing: false,
        surnames: form[0],
        firstName: form[1],
        email: form[2],
        phone: form[3],
        errorStatus: null,
      });
    } catch (err) {
      console.log(err);
    }
  };

  handleSubmitTopics = async () => {
    const {userTopics} = this.state;

    const input = await this.generateProofInput();

    await AsyncStorage.setItem(
      'userTopics',
      JSON.stringify(userTopics.join('_')),
    );
    this.setState({isEditingTopics: false, topicsEdited: true, input});
  };

  generateProofInput = async () => {
    const {userTopics, topics, siblings, root} = this.state;

    const endUserParsedAddress = (await AsyncStorage.getItem('address'))
      .slice(2)
      .toLowerCase();
    const addressAsBigInt = bigInt(endUserParsedAddress, 16);

    const paddedSiblings = siblings;
    while (paddedSiblings.length < 10) paddedSiblings.push(bigInt(0));

    const userTopicAddresses = topics
      .filter(t => userTopics.includes(t.title))
      .map(t => bigInt(t.address.slice(2).toLowerCase(), 16));
    const paddedTopics = userTopicAddresses;
    while (paddedTopics.length < 5) paddedTopics.push(bigInt(0));

    return {
      key: addressAsBigInt,
      value: addressAsBigInt,
      root,
      siblings: paddedSiblings,
      topics: paddedTopics,
      address: addressAsBigInt,
    };
  };

  handleUnregister = async () => {
    const {web3, contract} = this.state;
    const endUserAddress = await AsyncStorage.getItem('address');
    const privateKey = (await AsyncStorage.getItem('privateKey')).slice(2);
    this.setState({isProcessing: true}, async () => {
      console.log(`Blockchain process starting: ${this.state.isProcessing}`);
      try {
        const txCount = await web3.eth.getTransactionCount(endUserAddress);
        const rawTx = {
          to: CONFIG.contractAddress,
          nonce: web3.utils.toHex(txCount),
          value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
          gasLimit: web3.utils.toHex(700000),
          gasPrice: web3.utils.toHex(web3.utils.toWei('6', 'gwei')),
          data: contract.methods.unregisterUser().encodeABI(),
        };
        const tx = new Tx(rawTx, {chain: 'ropsten'});
        tx.sign(new Buffer.from(privateKey, 'hex'));
        const serializedTx = tx.serialize();
        web3.eth
          .sendSignedTransaction('0x' + serializedTx.toString('hex'))
          .on('transactionHash', async () => {
            await AsyncStorage.clear();
            this.setState({isProcessing: false, isUnregistering: false}, () =>
              RNRestart.Restart(),
            );
          });
      } catch (error) {
        console.log(error);
      }
    });
  };

  onLayout = () => {
    this.setState({
      dimensions: Dimensions.get('window'),
    });
  };

  renderLoading = () => {
    return (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <Text style={styles.descriptionContainer}>{literals.loading}</Text>
        <View style={styles.spinners}>
          <ActivityIndicator size="large" color="purple" />
        </View>
      </View>
    );
  };

  renderEditing = () => {
    const {
      firstName,
      surnames,
      email,
      phone,
      errorStatus,
      dimensions,
    } = this.state;
    return (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <Modal
          visible={errorStatus === 'errorPhoneNumber'}
          transparent={false}
          animationType="slide">
          <View style={styles.modalContainer}>
            <Text>{literals.invalidPhone}</Text>
            <View style={styles.modalButton}>
              <Button
                title={literals.okButton}
                onPress={() => this.setState({errorStatus: null})}
                color="orange"
              />
            </View>
          </View>
        </Modal>
        <ScrollView>
          <Text style={styles.descriptionContainer}>{literals.myData}</Text>
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.element}>
                <Text>{literals.surnames}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      width: dimensions.width / 3,
                    },
                  ]}
                  defaultValue={surnames}
                  onChangeText={surnames => this.handleFormInput(surnames, 0)}
                />
              </View>
              <View style={styles.element}>
                <Text>{literals.name}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      width: dimensions.width / 3,
                    },
                  ]}
                  defaultValue={firstName}
                  onChangeText={firstName => this.handleFormInput(firstName, 1)}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.element}>
                <Text>{literals.email}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      width: dimensions.width / 3,
                    },
                  ]}
                  defaultValue={email}
                  onChangeText={email => this.handleFormInput(email, 2)}
                  keyboardType={'email-address'}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.element}>
                <Text>{literals.phone}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      width: dimensions.width / 3,
                    },
                  ]}
                  keyboardType="phone-pad"
                  maxLength={12}
                  defaultValue={phone}
                  onChangeText={phone => this.handleFormInput(phone, 3)}
                />
              </View>
            </View>
          </View>
          <View style={{marginTop: 20}} />
          <Button
            title={literals.backButton}
            onPress={() => this.setState({isEditing: false})}
            color="orange"
          />
          <View style={{marginBottom: 10}} />
          <Button
            title={literals.updateButton}
            onPress={this.handleSubmit}
            color="orange"
          />
        </ScrollView>
      </View>
    );
  };

  renderEditingTopics = () => {
    const {topics, userTopics, dimensions} = this.state;
    return (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <ScrollView>
          <Text style={styles.descriptionContainer}>{literals.myTopics}</Text>
          {topics.length !== 0 ? (
            topics.map((topic, index) => (
              <CheckBox
                key={index}
                title={topic.title}
                checked={userTopics.includes(topic.title) ? true : false}
                checkedColor="purple"
                onPress={() => {
                  userTopics.includes(topic.title)
                    ? userTopics.splice(userTopics.indexOf(topic.title), 1)
                    : userTopics.push(topic.title);
                  this.setState({userTopics});
                }}
              />
            ))
          ) : (
            <View
              style={{
                justifyContent: 'center',
                height: dimensions.height / 3,
              }}>
              <Text style={styles.descriptionContainer}>
                {literals.noTopicsAvailable}
              </Text>
            </View>
          )}
          <View style={{marginBottom: 10}} />
          <Button
            title={literals.backButton}
            onPress={() => this.setState({isEditingTopics: false})}
            color="orange"
          />
          <View style={{marginBottom: 10}} />
          <Button
            title={literals.updateTopicsButton}
            onPress={() => {
              this.handleSubmitTopics();
            }}
            color="orange"
          />
        </ScrollView>
      </View>
    );
  };

  renderProfile = () => {
    const {
      firstName,
      surnames,
      email,
      phone,
      address,
      topicsEdited,
    } = this.state;
    const data = [firstName, surnames, email, phone, address];
    const keys = literals.keys;
    return (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <ScrollView>
          <Text style={[styles.descriptionContainer, {marginBottom: 10}]}>
            {literals.myProfile}
          </Text>
          {data.map((item, index) => {
            return (
              <View style={styles.item} key={index}>
                <Text style={styles.itemText}>{`${keys[index]}: ${item}`}</Text>
              </View>
            );
          })}
          <View style={{marginTop: 10}} />
          <Button
            title={literals.editButton}
            onPress={() => this.setState({isEditing: true})}
            color="orange"
          />
          <View style={{marginTop: 10}} />
          <Button
            title={literals.editTopicsButton}
            onPress={() => this.setState({isEditingTopics: true})}
            color="orange"
          />
          <View style={{marginTop: 10}} />
          <Button
            title={literals.generateProofButton}
            disabled={!topicsEdited}
            onPress={() => this.setState({isGeneratingProof: true})}
            color="orange"
          />
          <View style={{marginTop: 10}} />
          <Button
            title={literals.unregisterButton}
            onPress={() => this.setState({isUnregistering: true})}
            color="orange"
          />
        </ScrollView>
      </View>
    );
  };

  renderGeneratingProof = () => {
    const {input, userTopics} = this.state;
    const params = `
      window.address = '${String(input.address)}';
      window.key = '${String(input.key)}';
      window.root = '${String(input.root)}';
      window.value = '${String(input.value)}';
      window.siblings = '${input.siblings.map(s => String(s))}';
      window.topics = '${input.topics.map(t => String(t))}';
      window.topicNames = '${userTopics.map(t => String(t))}';
      true;
    `;
    return (
      <WebView source={{uri: CONFIG.webViewURL}} injectedJavaScript={params} />
    );
  };

  renderUnregistring = () => {
    return (
      <Modal visible={true} transparent={false} animationType="slide">
        <View style={styles.modalContainer}>
          <Text>{literals.unregisterText}</Text>
          <View style={[styles.row, styles.modalButton]}>
            <Button
              title={literals.okButton}
              onPress={this.handleUnregister}
              color="orange"
            />
            <View style={{paddingHorizontal: 30}} />
            <Button
              title={literals.unregisterCancelButton}
              onPress={() => this.setState({isUnregistering: false})}
              color="orange"
            />
          </View>
        </View>
      </Modal>
    );
  };

  renderProcessing = () => {
    return (
      <View style={styles.mainContainer}>
        <Text style={styles.descriptionContainer}>{literals.processing}</Text>
        <View style={styles.spinners}>
          <ActivityIndicator size="large" color="purple" />
        </View>
      </View>
    );
  };

  render() {
    const {
      isLoading,
      isEditing,
      isEditingTopics,
      isGeneratingProof,
      isUnregistering,
      isProcessing,
    } = this.state;
    return isLoading ? (
      this.renderLoading()
    ) : (
      <>
        <HDAHeader navigation={this.props.navigation} />
        {isEditing
          ? this.renderEditing()
          : isEditingTopics
          ? this.renderEditingTopics()
          : isGeneratingProof
          ? this.renderGeneratingProof()
          : isProcessing
          ? this.renderProcessing()
          : isUnregistering
          ? this.renderUnregistring()
          : this.renderProfile()}
      </>
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
  spinners: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: 30,
  },
  item: {
    padding: 10,
    backgroundColor: 'purple',
    marginLeft: 50,
    marginRight: 50,
    marginBottom: 10,
    borderRadius: 20,
  },
  itemText: {
    textAlign: 'center',
    color: 'white',
  },
  form: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  element: {
    padding: 10,
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    borderColor: 'purple',
    borderRadius: 10,
    textAlign: 'center',
    color: 'black',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  modalButton: {
    marginTop: 20,
  },
});

const mapStateToProps = state => {
  return {circuit: state};
};

export default connect(
  mapStateToProps,
  {},
)(ProfileScreen);

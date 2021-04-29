import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Button,
  Modal,
  Platform,
  NativeModules,
} from 'react-native';
import HDAHeader from '../navigation/HDAHeader';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import EthCrypto from 'eth-crypto';
import BackgroundTask from 'react-native-background-task';

const APPLE_HEALTH_KIT = require('rn-apple-healthkit');
const Tx = require('ethereumjs-tx').Transaction;
const GOOGLE_FIT_CLIENT = require('./../lib/google-fit-client.js');
const CONFIG = require('../config.json');
const CryptoJS = require('crypto-js');
const {RNRandomBytes} = NativeModules;

const literals = require('../literals/PendingRequestsScreen.json')['cat'];

BackgroundTask.define(async () => {
  console.log('Background task launched!');
  let steps;
  // OBTAIN DATA FROM GOOGLE FIT
  if (Platform.OS === 'android') {
    steps = await GOOGLE_FIT_CLIENT.getDailyStepCountSamples(
      '2017-01-01T00:00:17.971Z',
      new Date().toISOString(),
    );
  } else {
    APPLE_HEALTH_KIT.initHealthKit(
      {permissions: {read: ['StepCount']}},
      err => {
        if (err) {
          console.log(`error: ${err}`);
          return;
        }
        const d = new Date(2019, 1, 1);
        const options = {date: d.toISOString()};
        APPLE_HEALTH_KIT.getStepCount(options, async (err, result) => {
          if (err) {
            console.log(`error:  ${err}`);
            return;
          } else {
            steps = result;
          }
        });
      },
    );
  }
  // DATA AES ENCRYPTION
  RNRandomBytes.randomBytes(16, async (err, randomString) => {
    console.log(randomString);
    await AsyncStorage.setItem('AESSymmetricalKey', randomString);
    const cipheredSteps = CryptoJS.AES.encrypt(
      JSON.stringify(steps),
      randomString,
    );
    console.log(cipheredSteps.toString());
    const decipheredSteps = CryptoJS.AES.decrypt(
      cipheredSteps.toString(),
      randomString,
    );
    console.log(JSON.parse(decipheredSteps.toString(CryptoJS.enc.Utf8)));
    console.log(await AsyncStorage.getItem('AESSymmetricalKey'));
    // WRITE TO IPFS
    const bodyFormData = new FormData();
    bodyFormData.append('data', cipheredSteps.toString());
    const response = await axios({
      url: `${CONFIG.ipfsAPI}/add?pin=false`,
      method: 'post',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      data: bodyFormData,
    });
    console.log(response.data.Hash);
    // READ FROM IPFS
    let ipfsFile = await axios({
      method: 'get',
      url: `${CONFIG.ipfsAPI}/block/get?arg=${response.data.Hash}`,
    });
    console.log(ipfsFile.data);
    // UPDATE DATAURL
    const token = await AsyncStorage.getItem('accessToken');
    const instance = axios.create();
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await instance.put(`${CONFIG.backendURL}/user`, {
      dataUrl: `${CONFIG.ipfsAPI}/block/get?arg=${response.data.Hash}`,
    });
    BackgroundTask.finish();
  });
});

const Item = ({
  institutionName,
  address,
  project,
  handleAccept,
  handleReject,
  handleUpdate,
  publicKey,
}) => {
  const [show, setShow] = useState(false);
  const [showModalAccept, setModalAccept] = useState(false);
  const [showModalReject, setModalReject] = useState(false);
  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <TouchableWithoutFeedback onPress={() => setShow(!show)}>
          <Text style={styles.itemText}>
            {institutionName.length > 15
              ? institutionName.substring(0, 15 - 3) + '...'
              : institutionName}
          </Text>
        </TouchableWithoutFeedback>
        <View style={styles.buttons}>
          <View style={styles.button}>
            <Button
              title={literals.acceptButton}
              onPress={() => setModalAccept(true)}
              color="orange"
            />
          </View>
          <View style={styles.button}>
            <Button
              title={literals.rejectButton}
              onPress={() => setModalReject(true)}
              color="orange"
            />
          </View>
        </View>
      </View>
      <View style={styles.additionalInformation}>
        {project && project.description && project.title && show && (
          <Text style={styles.itemText}>
            {`${address} ${literals.context} ${project.title}; ${
              project.description
            }`}
          </Text>
        )}
      </View>
      <Modal
        visible={showModalAccept}
        transparent={false}
        animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.descriptionContainer}>
            {literals.modalAccept}
          </Text>
          <View style={styles.modalButton}>
            <Button
              title={literals.acceptButton}
              onPress={() =>
                handleAccept(address, handleUpdate, publicKey, project.address)
              }
              color="orange"
            />
          </View>
          <View style={styles.modalButton}>
            <Button
              title={literals.cancelButton}
              onPress={() => {
                setModalAccept(false);
              }}
              color="orange"
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={showModalReject}
        transparent={false}
        animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.descriptionContainer}>
            {`${literals.modalReject}${institutionName}`}
          </Text>
          <View style={styles.modalButton}>
            <Button
              title={literals.rejectButton}
              onPress={() =>
                handleReject(address, handleUpdate, project.address)
              }
              color="orange"
            />
          </View>
          <View style={styles.modalButton}>
            <Button
              title={literals.cancelButton}
              onPress={() => {
                setModalReject(false);
              }}
              color="orange"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

class PendingRequestsScreen extends React.Component {
  state = {
    isLoading: true,
    isProcessing: false,
    accessRequests: [],
  };
  async componentDidMount() {
    const web3 = this.props.screenProps.web3;
    const contract = this.props.screenProps.contract;
    const token = await AsyncStorage.getItem('accessToken');
    const instance = axios.create();
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const response = await instance.get(`${CONFIG.backendURL}/accessRequests`);
    const accessRequests = response.data.accessRequests;
    this.setState({isLoading: false, accessRequests, web3, contract});

    if (Platform.OS === 'android') {
      await GOOGLE_FIT_CLIENT.authorize();
    }
    // BackgroundTask.schedule();
  }

  handleAccept = async (
    researchInstitutionManagerAddress,
    handleUpdate,
    researchInstitutionManagerPublicKey,
    projectAddress,
  ) => {
    console.log('Accepting...');
    const {web3, contract} = this.state;
    const endUserAddress = await AsyncStorage.getItem('address');
    const privateKey = (await AsyncStorage.getItem('privateKey')).slice(2);
    RNRandomBytes.randomBytes(16, async (err, randomString) => {
      await AsyncStorage.setItem('AESSymmetricalKey', randomString);
      const encrypted = await EthCrypto.encryptWithPublicKey(
        researchInstitutionManagerPublicKey,
        randomString,
      );
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
            data: contract.methods
              .grantPermissionToInstitution(
                researchInstitutionManagerAddress,
                projectAddress,
              )
              .encodeABI(),
          };
          const tx = new Tx(rawTx, {chain: 'ropsten'});
          tx.sign(new Buffer.from(privateKey, 'hex'));
          const serializedTx = tx.serialize();
          web3.eth
            .sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .on('transactionHash', async () => {
              try {
                const token = await AsyncStorage.getItem('accessToken');
                const encryptedPasswordInstance = axios.create();
                encryptedPasswordInstance.defaults.headers.common[
                  'Authorization'
                ] = `Bearer ${token}`;
                await encryptedPasswordInstance.put(
                  `${
                    CONFIG.backendURL
                  }/accessRequest/${researchInstitutionManagerAddress}?projectAddress=${projectAddress}`,
                  {pendingBC: true, encryptedPassword: encrypted},
                );
                let steps;
                if (Platform.OS === 'android') {
                  steps = await GOOGLE_FIT_CLIENT.getDailyStepCountSamples(
                    '2019-01-01T00:00:17.971Z',
                    new Date().toISOString(),
                  );
                } else {
                  APPLE_HEALTH_KIT.initHealthKit(
                    {permissions: {read: ['StepCount']}},
                    err => {
                      if (err) {
                        console.log(`error: ${err}`);
                        return;
                      }
                      const d = new Date(2019, 1, 1);
                      const options = {date: d.toISOString()};
                      APPLE_HEALTH_KIT.getStepCount(
                        options,
                        async (err, result) => {
                          if (err) {
                            console.log(`error:  ${err}`);
                            return;
                          } else {
                            steps = result;
                          }
                        },
                      );
                    },
                  );
                }
                // DATA AES ENCRYPTION
                const aesSimmetricalKey = await AsyncStorage.getItem(
                  'AESSymmetricalKey',
                );
                const cipheredSteps = CryptoJS.AES.encrypt(
                  JSON.stringify(steps),
                  aesSimmetricalKey,
                );
                if (CONFIG.ipfsContingency) {
                  // IPFS CONTINGENCY
                  const bodyFormData = new FormData();
                  bodyFormData.append('data', cipheredSteps.toString());
                  await axios({
                    url: `${CONFIG.backendURL}/upload`,
                    method: 'post',
                    headers: {
                      'Content-Type': 'multipart/form-data',
                      Authorization: `Bearer ${token}`,
                    },
                    data: bodyFormData,
                  });
                  //
                } else {
                  // WRITE TO IPFS
                  const bodyFormData = new FormData();
                  bodyFormData.append('data', cipheredSteps.toString());
                  const response = await axios({
                    url: `${CONFIG.ipfsAPI}/add?pin=false`,
                    method: 'post',
                    headers: {
                      'Content-Type': 'multipart/form-data',
                    },
                    data: bodyFormData,
                  });
                  // UPDATE DATAURL
                  const updateUrlInstance = axios.create();
                  updateUrlInstance.defaults.headers.common[
                    'Authorization'
                  ] = `Bearer ${token}`;
                  await updateUrlInstance.put(`${CONFIG.backendURL}/user`, {
                    dataUrl: `${CONFIG.ipfsAPI}/block/get?arg=${
                      response.data.Hash
                    }`,
                  });
                }
                handleUpdate(projectAddress);
              } catch (err) {
                console.log(err);
              }
            });
        } catch (err) {
          console.log(err);
        }
      });
    });
  };

  handleReject = async (
    researchInstitutionManagerAddress,
    handleUpdate,
    projectAddress,
  ) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await instance.delete(
        `${
          CONFIG.backendURL
        }/accessRequest/${researchInstitutionManagerAddress}?projectAddress=${projectAddress}`,
      );
      handleUpdate(projectAddress);
    } catch (err) {
      console.log(err);
    }
  };

  handleUpdate = projectAddress => {
    const {accessRequests} = this.state;
    const updatedAccessRequests = accessRequests.filter(
      ar => ar.project.address !== projectAddress,
    );
    this.setState({accessRequests: updatedAccessRequests, isProcessing: false});
  };

  render() {
    const {isLoading, isProcessing, accessRequests} = this.state;
    const data = accessRequests
      .filter(
        ar =>
          ar.granted === false &&
          ar.revoked === false &&
          ar.pendingBC === false,
      )
      .map(ar => {
        return {
          id: ar.researchInstitutionManager._id,
          institutionName: ar.researchInstitutionManager.institutionName,
          address: ar.researchInstitutionManager.address,
          project: ar.project,
          publicKey: ar.publicKey.publicKey,
        };
      });

    return isLoading ? (
      <View style={styles.mainContainer}>
        <Text style={styles.descriptionContainer}>{literals.loading}</Text>
        <View style={styles.spinners}>
          <ActivityIndicator size="large" color="purple" />
        </View>
      </View>
    ) : isProcessing ? (
      <View style={styles.mainContainer}>
        <Text style={styles.descriptionContainer}>{literals.processing}</Text>
        <View style={styles.spinners}>
          <ActivityIndicator size="large" color="purple" />
        </View>
      </View>
    ) : (
      <>
        <HDAHeader navigation={this.props.navigation} />
        <View style={styles.mainContainer}>
          {data.length === 0 && (
            <Text style={styles.descriptionContainer}>
              {literals.noAccessRequests}
            </Text>
          )}
          {data.length !== 0 && (
            <SafeAreaView style={styles.mainContainer}>
              <Text style={styles.descriptionContainer}>
                {literals.accessRequests}
              </Text>
              <FlatList
                data={data}
                renderItem={({item}) => (
                  <Item
                    institutionName={item.institutionName}
                    address={item.address}
                    project={item.project}
                    handleUpdate={this.handleUpdate.bind(this)}
                    handleAccept={this.handleAccept.bind(this)}
                    handleReject={this.handleReject.bind(this)}
                    publicKey={item.publicKey}
                  />
                )}
                keyExtractor={item => item.project.address}
              />
            </SafeAreaView>
          )}
        </View>
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
    paddingBottom: 8,
  },
  spinners: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: 30,
  },
  item: {
    backgroundColor: 'purple',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  itemText: {
    color: 'white',
  },
  buttons: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginRight: -20,
  },
  button: {
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalContainer: {marginTop: 200},
  modalButton: {
    marginTop: 30,
    alignItems: 'center',
  },
});

export default PendingRequestsScreen;

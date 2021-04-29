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
} from 'react-native';
import HDAHeader from '../navigation/HDAHeader';
import axios from 'axios';
import AsyncStorage from '@react-native-community/async-storage';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';

const Tx = require('ethereumjs-tx').Transaction;
const CONFIG = require('../config.json');

const literals = require('../literals/AcceptedRequestsScreen.json')['cat'];

const Item = ({
  institutionName,
  address,
  project,
  handleRevoke,
  handleUpdate,
}) => {
  const [show, setShow] = useState(false);
  const [showModalRevoke, setModalRevoke] = useState(false);
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
        <View style={styles.button}>
          <Button
            title={literals.revokeButton}
            onPress={() => setModalRevoke(true)}
            color="orange"
          />
        </View>
      </View>
      <View style={styles.additionalInformation}>
        {project && project.description && project.title && show && (
          <Text style={styles.itemText}>
            {`${address} ${literals.context} ${project.title}; ${project.description}`}
          </Text>
        )}
      </View>
      <Modal
        visible={showModalRevoke}
        transparent={false}
        animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.descriptionContainer}>
            {`${literals.modalRevoke}${institutionName}`}
          </Text>
          <View style={styles.modalButton}>
            <Button
              title={literals.revokeButton}
              onPress={() =>
                handleRevoke(address, handleUpdate, project.address)
              }
              color="orange"
            />
          </View>
          <View style={styles.modalButton}>
            <Button
              title={literals.cancelButton}
              onPress={() => {
                setModalRevoke(false);
              }}
              color="orange"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

class AccessRequestsScreen extends React.Component {
  state = {isLoading: true, accessRequests: []};
  async componentDidMount() {
    const web3 = this.props.screenProps.web3;
    const contract = this.props.screenProps.contract;
    const token = await AsyncStorage.getItem('accessToken');
    const instance = axios.create();
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const response = await instance.get(`${CONFIG.backendURL}/accessRequests`);
    const accessRequests = response.data.accessRequests;
    this.setState({isLoading: false, accessRequests, web3, contract});
  }

  handleRevoke = async (
    researchInstitutionManagerAddress,
    handleUpdate,
    projectAddress,
  ) => {
    const {web3, contract} = this.state;
    const endUserAddress = await AsyncStorage.getItem('address');
    const privateKey = (await AsyncStorage.getItem('privateKey')).slice(2);
    try {
      const txCount = await web3.eth.getTransactionCount(endUserAddress);
      const rawTx = {
        to: CONFIG.contractAddress,
        nonce: web3.utils.toHex(txCount),
        value: web3.utils.toHex(web3.utils.toWei('0', 'ether')),
        gasLimit: web3.utils.toHex(700000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('6', 'gwei')),
        data: contract.methods
          .revokePermissionToInstitution(
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
            const instance = axios.create();
            instance.defaults.headers.common[
              'Authorization'
            ] = `Bearer ${token}`;
            await instance.put(
              `${CONFIG.backendURL}/accessRequest/${researchInstitutionManagerAddress}?projectAddress=${projectAddress}`,
              {pendingBC: true},
            );
            handleUpdate(projectAddress);
          } catch (err) {
            console.log(err);
          }
        });
    } catch (err) {
      console.log(err);
    }
  };

  handleUpdate = projectAddress => {
    const {accessRequests} = this.state;
    const updatedAccessRequests = accessRequests.filter(
      ar =>
        ar.project.address !==
        projectAddress,
    );
    this.setState({accessRequests: updatedAccessRequests});
  };

  render() {
    const {isLoading, accessRequests} = this.state;
    const data = accessRequests
      .filter(ar => ar.granted === true)
      .map(ar => {
        return {
          id: ar.researchInstitutionManager._id,
          institutionName: ar.researchInstitutionManager.institutionName,
          address: ar.researchInstitutionManager.address,
          project: ar.project,
        };
      });
    return isLoading ? (
      <View style={styles.mainContainer}>
        <Text style={styles.descriptionContainer}>{literals.loading}</Text>
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
              {literals.noGrantedRequests}
            </Text>
          )}
          {data.length !== 0 && (
            <SafeAreaView style={styles.mainContainer}>
              <Text style={styles.descriptionContainer}>
                {literals.grantedRequests}
              </Text>
              <FlatList
                data={data}
                renderItem={({item}) => (
                  <Item
                    institutionName={item.institutionName}
                    address={item.address}
                    project={item.project}
                    handleUpdate={this.handleUpdate.bind(this)}
                    handleRevoke={this.handleRevoke.bind(this)}
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
  button: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginLeft: 'auto',
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

export default AccessRequestsScreen;

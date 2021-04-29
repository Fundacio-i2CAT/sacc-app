import React from 'react';
import {
  View,
  Text,
  Button,
  Image,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Dimensions,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { LinearTextGradient } from 'react-native-text-gradient';
import AsyncStorage from '@react-native-community/async-storage';
import { Picker } from '@react-native-community/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import icon from '../assets/img/saluscoop.png';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

const CONFIG = require('../config.json');

const literals = require('../literals/RegisterScreen')['spa'];

const parseJWT = token => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );
  return JSON.parse(jsonPayload);
};

class RegisterScreen extends React.Component {
  state = {
    registering: '',
    form: ['', '', '', '+34', '', '', ''],
    contactOK: '#342F2E',
    contactKO: '#342F2E',
    contactPhone: '#342F2E',
    contactEmail: '#342F2E',
    showBirthDatePicker: false,
    showGenderPicker: false,
    dimensions: Dimensions.get('window'),
    orientation:
      Dimensions.get('window').width < Dimensions.get('window').height
        ? 'portrait'
        : 'landscape',
  };

  async componentDidMount() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await instance.get(
        `${CONFIG.backendURL}/registerRequest`,
      );
      if (response.status === 200) {
        this.setState({ registering: 'inProcess' });
      }
    } catch (err) {
      console.log(err);
    }
  }

  handleFormInput = (data, index) => {
    const { form } = this.state;
    form[index] = data;
    this.setState({ form, showBirthDatePicker: false, showGenderPicker: false });
  };

  handleSubmit = async () => {
    try {
      const { form, contactOK, contactPhone, contactEmail } = this.state;
      let contactMethod = 'none';
      if (contactPhone === 'green') contactMethod = 'phone';
      else if (contactEmail === 'green') contactMethod = 'email';
      const token = await AsyncStorage.getItem('accessToken');
      const firebaseCloudToken = await AsyncStorage.getItem(
        'firebaseCloudToken',
      );
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (!form[3].match(/^\+34\d{9}$/)) {
        this.setState({ registering: 'errorPhoneNumber' });
      } else if (
        contactPhone === '#342F2E' &&
        contactEmail === '#342F2E' &&
        contactOK === 'green'
      ) {
        this.setState({ registering: 'errorContactMethod' });
      } else {
        const user = {
          surnames: form[0],
          firstName: form[1],
          email: form[2],
          phone: form[3],
          gender: form[4],
          dateOfBirth: form[5],
          postalCode: form[6],
          contactMethod,
          pendingBC: true,
          role: 'END_USER',
          firebaseCloudToken,
        };
        await instance.post(`${CONFIG.backendURL}/registerRequest`, {
          ...user,
        });
        this.setState({ registering: 'inProcess' });
      }
    } catch (err) {
      this.setState({ registering: 'error' });
    }
  };

  handleCancel = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const endUserAddress = parseJWT(token).address;
      const instance = axios.create();
      instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await instance.delete(
        `${CONFIG.backendURL}/registerRequest/${endUserAddress}`,
      );
      this.setState({ registering: '' });
    } catch (err) {
      console.log(err);
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
      registering,
      contactOK,
      contactKO,
      contactPhone,
      contactEmail,
      dimensions,
      orientation,
    } = this.state;
    let sd = new Date();
    return (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        {registering === '' && (
          <ScrollView>
            <View style={styles.registerContainer}>
              <Image
                source={icon}
                style={{
                  width:
                    orientation === 'portrait'
                      ? dimensions.width / 4
                      : Platform.OS === 'android'
                        ? (dimensions.width * 2) / 7
                        : dimensions.width / 3,
                  height:
                    orientation === 'portrait'
                      ? dimensions.height / 8
                      : Platform.OS === 'android'
                        ? (dimensions.height * 2) / 5
                        : dimensions.height / 2,
                  marginTop:
                    orientation === 'portrait'
                      ? dimensions.height / 30
                      : dimensions.height / 15,
                  marginBottom:
                    orientation === 'portrait'
                      ? dimensions.height / 60
                      : dimensions.height / 30,
                }}
              />
              <LinearTextGradient
                style={styles.licenseTitle}
                locations={[0, 1]}
                colors={['purple', 'orange']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                <Text>{literals.saluscoopLicenseTitle}</Text>
              </LinearTextGradient>
              <Text style={{ color: 'grey' }}>
                {literals.saluscoopLicenseSecondTitle}
              </Text>
              <View
                style={[
                  styles.dividingLine,
                  {
                    marginVertical: dimensions.height / 30,
                    marginHorizontal: dimensions.width / 20,
                  },
                ]}
              />
              <View
                style={{
                  marginRight: dimensions.width / 5,
                }}>
                <View style={styles.licenseRow}>
                  <View style={styles.numberContainer}>
                    <Text style={styles.number}>1</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={{ fontWeight: 'bold' }}>
                      {literals.firstTitle}
                    </Text>
                    <Text>{literals.firstContent}</Text>
                  </Text>
                </View>
                <View style={styles.licenseRow}>
                  <View style={styles.numberContainer}>
                    <Text style={styles.number}>2</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={{ fontWeight: 'bold' }}>
                      {literals.secondTitle}
                    </Text>
                    <Text>{literals.secondContent}</Text>
                  </Text>
                </View>
                <View style={styles.licenseRow}>
                  <View style={styles.numberContainer}>
                    <Text style={styles.number}>3</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={{ fontWeight: 'bold' }}>
                      {literals.thirdTitle}
                    </Text>
                    <Text>{literals.thirdContent}</Text>
                  </Text>
                </View>
                <View style={styles.licenseRow}>
                  <View style={styles.numberContainer}>
                    <Text style={styles.number}>4</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={{ fontWeight: 'bold' }}>
                      {literals.fourthTitle}
                    </Text>
                    <Text>{literals.fourthContent}</Text>
                  </Text>
                </View>
                <View style={styles.licenseRow}>
                  <View style={styles.numberContainer}>
                    <Text style={styles.number}>5</Text>
                  </View>
                  <Text style={styles.paragraph}>
                    <Text style={{ fontWeight: 'bold' }}>
                      {literals.fifthTitle}
                    </Text>
                    <Text>{literals.fifthContent}</Text>
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 10 }} />
            <Button
              title={literals.registerButton}
              onPress={() => this.setState({ registering: 'endUser' })}
              color="orange"
            />
          </ScrollView>
        )}
        {registering === 'endUser' && (
          <ScrollView>
            <View style={styles.form}>
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accesible={false}>
                <Text>{literals.myData}</Text>
                <View style={styles.row}>
                  <View style={styles.element}>
                    <Text>{literals.surnames}</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          width: dimensions.width / 2,
                        },
                      ]}
                      onChangeText={surnames =>
                        this.handleFormInput(surnames, 0)
                      }
                      defaultValue={this.state.form[0]}
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
                      onChangeText={name => this.handleFormInput(name, 1)}
                      defaultValue={this.state.form[1]}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.element}>
                    <Text>{literals.gender}</Text>
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        height: 40,
                        borderWidth: 1,
                        borderColor: 'purple',
                        borderRadius: 10,
                        width: (2 * dimensions.width) / 6,
                      }}>
                      {Platform.OS === 'ios' ? (
                        <TouchableWithoutFeedback
                          style={{
                            justifyContent: "center", height: 40, width: (2 * dimensions.width) / 6
                          }}
                          onPress={() =>
                            this.setState({ showGenderPicker: true })
                          }>
                          <Text style={{ textAlign: "center" }}>
                            {this.state.form[4]}
                          </Text>
                        </TouchableWithoutFeedback>
                      ) : (
                          <Picker
                            style={{ transform: [{ scale: 0.9 }] }}
                            selectedValue={this.state.form[4]}
                            onValueChange={itemValue => {
                              this.handleFormInput(itemValue, 4);
                            }}>
                            <Picker.Item label="" value="" />
                            <Picker.Item label={literals.male} value="male" />
                            <Picker.Item label={literals.female} value="female" />
                          </Picker>
                        )}
                      <Modal
                        visible={this.state.showGenderPicker}
                      >
                        <View style={{ flex: 1, justifyContent: "center" }}>
                          <Picker
                            selectedValue={this.state.form[4]}
                            onValueChange={itemValue => {
                              this.handleFormInput(itemValue, 4);
                            }}>
                            <Picker.Item label="" value="" />
                            <Picker.Item label={literals.male} value={literals.male} />
                            <Picker.Item label={literals.female} value={literals.female} />
                          </Picker>
                        </View>
                      </Modal>
                    </View>
                  </View>
                  <View style={styles.element}>
                    <Text>{literals.dateOfBirth}</Text>
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        height: 40,
                        borderWidth: 1,
                        borderColor: 'purple',
                        borderRadius: 10,
                        width: (3 * dimensions.width) / 6,
                      }}>
                      <TouchableWithoutFeedback
                        onPress={() =>
                          this.setState({ showBirthDatePicker: true })
                        }>
                        <Text
                          style={{
                            textAlign: 'center',
                            fontStyle:
                              this.state.form[5] === '' ? 'italic' : 'normal',
                            color: this.state.form[5] === '' ? 'grey' : 'black',
                          }}>
                          {this.state.form[5] === ''
                            ? literals.showCalendar
                            : this.state.form[5]}
                        </Text>
                      </TouchableWithoutFeedback>
                    </View>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.element}>
                    <Text>{literals.email}</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          width: dimensions.width / 2,
                        },
                      ]}
                      onChangeText={email => this.handleFormInput(email, 2)}
                      keyboardType={'email-address'}
                      autoCapitalize="none"
                      defaultValue={this.state.form[2]}
                    />
                  </View>
                  <View style={styles.element}>
                    <Text>{literals.phone}</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          textAlign:
                            this.state.form[3] === '+34' ? 'left' : 'center',
                          width: dimensions.width / 3,
                        },
                      ]}
                      keyboardType="phone-pad"
                      maxLength={12}
                      defaultValue={this.state.form[3]}
                      onChangeText={phone => this.handleFormInput(phone, 3)}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.element}>
                    <Text>{literals.postalCode}</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          width: dimensions.width / 2,
                        },
                      ]}
                      onChangeText={postalCode =>
                        this.handleFormInput(postalCode, 6)
                      }
                      defaultValue={this.state.form[6]}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.element}>
                    <Text>{literals.contact}</Text>
                  </View>
                </View>
                <View style={[styles.row, { justifyContent: 'center' }]}>
                  <TouchableWithoutFeedback
                    style={{
                      marginHorizontal: dimensions.width / 20,
                      marginBottom:
                        contactOK === 'green' ? 0 : dimensions.height / 80,
                    }}
                    onPress={() => {
                      this.setState({
                        contactOK: 'green',
                        contactKO: '#342F2E',
                      });
                    }}>
                    <Icon
                      name="md-checkmark-circle-outline"
                      backgroundColor="white"
                      color={contactOK}
                      size={40}
                    />
                  </TouchableWithoutFeedback>
                  <TouchableWithoutFeedback
                    style={{ marginHorizontal: dimensions.width / 20 }}
                    onPress={() => {
                      this.setState({
                        contactOK: '#342F2E',
                        contactKO: 'red',
                        contactPhone: '#342F2E',
                        contactEmail: '#342F2E',
                      });
                    }}>
                    <Icon
                      name="md-close-circle-outline"
                      backgroundColor="white"
                      color={contactKO}
                      size={40}
                    />
                  </TouchableWithoutFeedback>
                </View>
                {contactOK === 'green' && (
                  <>
                    <View style={styles.row}>
                      <View style={styles.element}>
                        <Text>{literals.contactMethod}</Text>
                      </View>
                    </View>
                    <View style={[styles.row, { justifyContent: 'center' }]}>
                      <TouchableWithoutFeedback
                        style={{ marginHorizontal: dimensions.width / 20 }}
                        onPress={() => {
                          this.setState({
                            contactPhone: 'green',
                            contactEmail: '#342F2E',
                          });
                        }}>
                        <Icon
                          name="md-call"
                          backgroundColor="white"
                          color={contactPhone}
                          size={40}
                        />
                      </TouchableWithoutFeedback>
                      <TouchableWithoutFeedback
                        style={{
                          marginHorizontal: dimensions.width / 20,
                          marginBottom: dimensions.height / 80,
                        }}
                        onPress={() => {
                          this.setState({
                            contactPhone: '#342F2E',
                            contactEmail: 'green',
                          });
                        }}>
                        <Icon
                          name="md-mail-open"
                          backgroundColor="white"
                          color={contactEmail}
                          size={40}
                        />
                      </TouchableWithoutFeedback>
                    </View>
                  </>
                )}
              </TouchableWithoutFeedback>
            </View>
            <Button
              title={literals.backButton}
              onPress={() => this.setState({ registering: '' })}
              color="orange"
            />
            <View style={{ marginBottom: 10 }} />
            <Button
              title={literals.registerButton}
              onPress={this.handleSubmit}
              color="orange"
            />
          </ScrollView>
        )}
        {registering === 'inProcess' && (
          <>
            <Text style={styles.descriptionContainer}>
              {literals.processingRequest}
            </Text>
            <View style={styles.spinners}>
              <ActivityIndicator size="large" color="purple" />
            </View>
            <View style={styles.cancelButtonContainer}>
              <Button
                title={literals.cancelButton}
                onPress={this.handleCancel}
                color="orange"
              />
            </View>
          </>
        )}
        <Modal
          visible={registering === 'errorPhoneNumber'}
          transparent={false}
          animationType="slide">
          <View style={styles.modalContainer}>
            <Text>{literals.unsuccessfulRegistrationEmail}</Text>
            <View style={styles.modalButton}>
              <Button
                title={literals.okButton}
                onPress={() => this.setState({ registering: 'endUser' })}
                color="orange"
              />
            </View>
          </View>
        </Modal>
        <Modal
          visible={registering === 'errorContactMethod'}
          transparent={false}
          animationType="slide">
          <View style={styles.modalContainer}>
            <Text>{literals.unsuccessfulRegistrationContactMethod}</Text>
            <View style={styles.modalButton}>
              <Button
                title={literals.okButton}
                onPress={() => this.setState({ registering: 'endUser' })}
                color="orange"
              />
            </View>
          </View>
        </Modal>
        <Modal
          visible={registering === 'error'}
          transparent={false}
          animationType="slide">
          <View style={styles.modalContainer}>
            <Text>{literals.unsuccessfulRegistration}</Text>
            <View style={styles.modalButton}>
              <Button
                title={literals.okButton}
                onPress={() => this.setState({ registering: 'endUser' })}
                color="orange"
              />
            </View>
          </View>
        </Modal>
        {Platform.OS === 'android' && this.state.showBirthDatePicker ? (
          <DateTimePicker
            value={new Date()}
            onChange={(event, selectedDate) => {
              if (event.type === 'set') {
                const dateAsString = String(selectedDate);
                const splitDate = dateAsString.split(' ');
                const dateOfBirth = `${splitDate[2]}-${splitDate[1]}-${
                  splitDate[3]
                  }`;
                this.handleFormInput(dateOfBirth, 5);
              }
            }}
          />
        ) : (
            <Modal
              visible={this.state.showBirthDatePicker}
            >
              <View style={{ flex: 1, justifyContent: "center" }}>
                <DateTimePicker
                  value={new Date()}
                  onChange={(event, selectedDate) => {
                    sd = selectedDate;
                  }}
                />
                <Button
                  title={literals.confirmButton}
                  onPress={() => {
                    const dateAsString = String(sd);
                    const splitDate = dateAsString.split(' ');
                    const dateOfBirth = `${splitDate[2]}-${splitDate[1]}-${
                      splitDate[3]
                      }`;
                    this.handleFormInput(dateOfBirth, 5);
                  }}
                  color="orange"
                />
              </View>
            </Modal>
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
  registerContainer: {
    alignItems: 'center',
  },
  form: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  element: {
    padding: 5,
  },
  registerButton: {
    padding: 10,
  },
  descriptionContainer: {
    textAlign: 'center',
  },
  textInput: {
    height: 40,
    borderWidth: 1,
    width: 150,
    borderColor: 'purple',
    borderRadius: 10,
    textAlign: 'center',
    color: 'black',
  },
  spinners: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginTop: 30,
  },
  cancelButtonContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  modalButton: {
    marginTop: 20,
  },
  dividingLine: {
    borderBottomColor: 'grey',
    borderBottomWidth: 1,
    alignSelf: 'stretch',
  },
  paragraph: {
    padding: 10,
    paddingRight: 30,
  },
  numberContainer: {
    textAlign: 'center',
    marginLeft: 40,
    backgroundColor: 'orange',
    borderRadius: 20,
    width: 20,
    height: 20,
  },
  number: {
    marginLeft: 6,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseTitle: {
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    marginHorizontal: 20,
  },
});

export default RegisterScreen;

import React from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import bip39 from 'react-native-bip39';

const literals = require('../literals/GenerateMnemonicScreen.json')['en'];

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

class GenerateMnemonicScreen extends React.Component {
  state = {
    isLoading: true,
    mnemonic: [],
    reveal: false,
    dimensions: Dimensions.get('window'),
  };

  componentDidMount() {
    this.setState({isLoading: false});
  }

  handleMnemonicCreation = async e => {
    e.preventDefault();
    const mnemonic = await bip39.generateMnemonic();
    this.setState({mnemonic: mnemonic.split(' ')});
  };

  onLayout = () => {
    this.setState({
      dimensions: Dimensions.get('window'),
    });
  };

  render() {
    const {isLoading, mnemonic, reveal, dimensions} = this.state;
    return isLoading ? (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <Text style={styles.descriptionText}>{literals.loading}</Text>
      </View>
    ) : (
      <View onLayout={this.onLayout} style={styles.mainContainer}>
        <View>
          <ScrollView>
            {mnemonic.length !== 0 ? (
              <View style={{marginHorizontal: dimensions.width / 16}}>
                <Text style={styles.descriptionText}>
                  {literals.noteDownWarning}
                </Text>
              </View>
            ) : (
              <View>
                <View
                  style={{
                    marginHorizontal: dimensions.width / 16,
                  }}>
                  <Text style={[styles.descriptionText, {marginBottom: 20}]}>
                    {literals.generateMnemonic}
                  </Text>
                </View>
                <Button
                  onPress={this.handleMnemonicCreation}
                  title={literals.generateMnemonicButton}
                  color="orange"
                />
              </View>
            )}
            {mnemonic.length !== 0 && (
              <View>
                {reveal === true ? (
                  <View style={{marginVertical: dimensions.height / 20}}>
                    <MnemonicGrid words={mnemonic} />
                  </View>
                ) : (
                  <View style={styles.revealButtonContainer}>
                    <Icon.Button
                      name="md-eye"
                      backgroundColor="white"
                      color="#900"
                      size={50}
                      iconStyle={{marginRight: 0}}
                      onPress={() => this.setState({reveal: true})}>
                      <Text style={styles.revealMnemonicButton}>
                        {literals.revealMnemonicButton}
                      </Text>
                    </Icon.Button>
                  </View>
                )}
                <Button
                  onPress={() =>
                    this.props.navigation.navigate('ConfirmMnemonic', {
                      mnemonic,
                    })
                  }
                  title={literals.continueButton}
                  color="orange"
                />
              </View>
            )}
          </ScrollView>
        </View>
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
  descriptionText: {
    textAlign: 'center',
  },
  revealButtonContainer: {
    alignItems: 'center',
  },
  revealMnemonicButton: {
    color: '#900',
    paddingLeft: 15,
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

export default GenerateMnemonicScreen;

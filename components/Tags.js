import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

class Tags extends React.Component {
  state = {tags: [], readOnly: false};
  componentDidMount() {
    this.setState({
      tags: this.props.initialTags,
      readOnly: this.props.readOnly || false,
    });
  }

  handleRemove = index => {
    const {tags, readOnly} = this.state;
    const {onTagPress} = this.props;
    if (!readOnly) {
      const newTags = tags.filter((t, i) => !(i === index));
      onTagPress(tags[index]);
      this.setState({tags: newTags});
    }
  };

  render() {
    return (
      <View style={styles.tagList}>
        {this.state.tags.map((tag, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tagSeparation}
            onPress={() => this.handleRemove(index)}>
            <View style={styles.tagButton}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  tagButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'purple',
    height: 50,
    width: 'auto',
    borderRadius: 20,
    padding: 15,
  },
  tagList: {
    flexDirection: 'row',
    paddingLeft: 30,
    flexWrap: 'wrap',
  },
  tagSeparation: {
    flexDirection: 'row',
    paddingRight: 5,
    paddingBottom: 5,
  },
  tagText: {
    color: 'white',
  },
});

export default Tags;

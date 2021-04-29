import {UPDATE_CIRCUIT} from './actionTypes';

import axios from 'axios';

const CONFIG = require('../config.json');

const updateCircuit = circuit => ({
  type: UPDATE_CIRCUIT,
  circuit,
});

export const updateCircuitAsync = () => {
  return async dispatch => {
    try {
      const instance = axios.create();
      const circuit = await instance.get(`${CONFIG.backendURL}/circuit`);
      const circuitAsBuffer = Buffer.from(circuit.data.wasmAsArray);
      dispatch(updateCircuit(circuitAsBuffer));
      console.log('Circuit loaded');
    } catch (e) {
      console.log(e);
    }
  };
};

import {UPDATE_CIRCUIT} from './actionTypes';

export default (state = {}, action) => {
  switch (action.type) {
    case UPDATE_CIRCUIT:
      return {...state, wasmAsBuffer: action.circuit};
    default:
      return state;
  }
};

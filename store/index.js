import rootReducer from './reducers';
import {createStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';

export function configureStore() {
  return createStore(rootReducer, applyMiddleware(thunk));
}
import { combineReducers } from 'redux';
import terminalsReducer from '../../features/terminals/terminalSlice';
import ordersReducer from '../../features/orders/orderSlice';

export default combineReducers({
  terminals: terminalsReducer,
  orders: ordersReducer,
});

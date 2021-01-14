import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import App from './pages/App';
import BurgerPos from './pages/Burger';
import MotelPos from './pages/Motel';
import Default from './pages/Default';
// import RamenPos from './pages/Ramen';
import TablePos from './pages/Table';
import SupportTools from './pages/SupportTools';
import store from './redux/store';
import watchTerminalEvents from './features/terminals/terminalEvents';

import './index.scss';

const Routes = () => {
  store.dispatch(watchTerminalEvents());
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/">
          <App />
        </Route>
        <Route path="/burger">
          <Provider store={store}>
            <BurgerPos />
          </Provider>
        </Route>
        <Route path="/motel">
          <MotelPos />
        </Route>
        <Route path="/ramen">
          {/* <RamenPos /> */}
          <Default />
        </Route>
        <Route path="/table">
          <TablePos />
        </Route>
        <Route path="/support-tools">
          <SupportTools />
        </Route>
      </Switch>
    </BrowserRouter>
  );
};

ReactDOM.render(<Routes />, document.getElementById('root'));

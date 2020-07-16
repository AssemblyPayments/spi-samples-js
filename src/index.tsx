import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import App from './pages/App';
import BurgerPos from './pages/Burger';
// import MotelPos from './pages/Motel';
import Default from './pages/Default';
// import RamenPos from './pages/Ramen';
// import TablePos from './pages/Table';
import SupportTools from './pages/SupportTools';

import './index.scss';

const Routes = () => (
  <BrowserRouter>
    <Switch>
      <Route exact path="/">
        <App />
      </Route>
      <Route path="/burger">
        <BurgerPos />
      </Route>
      <Route path="/motel">
        {/* <MotelPos /> */}
        <Default />
      </Route>
      <Route path="/ramen">
        {/* <RamenPos /> */}
        <Default />
      </Route>
      <Route
        path="/table"
        component={() => {
          window.location.href = 'http://spi-samples-tablepos.herokuapp.com/TablePos/TablePos.html';
          return null;
        }}
      />
      <Route path="/support-tools">
        <SupportTools />
      </Route>
    </Switch>
  </BrowserRouter>
);

ReactDOM.render(<Routes />, document.getElementById('root'));

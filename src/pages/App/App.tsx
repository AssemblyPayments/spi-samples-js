import React from 'react';
import { Link } from 'react-router-dom';
import { getSpiVersion } from '../../services/_common/uiHelpers';

import './App.css';

const App = () => (
  <div className="app">
    <h1 className="bpos-heading">Choose your SPI {getSpiVersion()} POS Sample</h1>
    <div className="supportalignment">
      <Link to="/support-tools">
        <span role="img" aria-label="settings">
          🛠️
        </span>
      </Link>
    </div>
    <nav className="homePageLink">
      <ol>
        <li>
          <Link to="/burger">Burger POS</Link>
        </li>
        <li>
          <Link to="/ramen">Ramen POS</Link>
        </li>
        <li>
          <Link to="/motel">Motel POS</Link>
        </li>
        <li>
          <Link to="/table">Table POS</Link>
        </li>
      </ol>
    </nav>
  </div>
);

export default App;

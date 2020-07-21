import React, { useState } from 'react';
import { Table, Alert, Row, Col } from 'react-bootstrap';
import { Input } from '../../../components/Input';
import Checkbox from '../../../components/Checkbox';
import { Connection } from '../connection';

function AutoAddressCheck() {
  const [serialNumber, setSerialNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [fqdn, setFqdn] = useState('');
  const [ip, setIp] = useState('');
  const [timeStampFqdn, setTimeStampFqdn] = useState('');
  const [timeStampIp, setTimeStampIp] = useState('');
  const [testMode, setTestMode] = useState(false);
  const [result, setResult] = useState('');
  const [errorResponse, setErrorResponse] = useState({
    request_id: '',
    error_code: 111,
    error: '',
  });
  const [googleDns, setGoogleDns] = useState({
    Answer: [{ name: '321-490-753.z1.sandbox.apdvcs.net.', data: '192.168.1.102' }],
  });

  function fetchResponse() {
    fetchFqdn();
    fetchIp();
  }
  async function fetchFqdn() {
    const response = await fetch(
      `https://device-address-api${testMode ? '-sb' : ''}.wbc.mspenv.io/v1/${serialNumber}/fqdn`,
      {
        headers: {
          'ASM-MSP-DEVICE-ADDRESS-API-KEY': apiKey,
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      setFqdn(data.fqdn);
      setTimeStampFqdn(data.last_updated);
      setResult('success');
      webSocketFqdn(data.fqdn);
    } else {
      const data = await response.json();
      setErrorResponse(data);
      setResult('error');
    }
    if (result === 'success') {
      const response1 = await fetch(`https://dns.google/resolve?name=${fqdn}`);
      if (response1.ok) {
        const data = await response1.json();
        setGoogleDns(data);
      }
    }
  }
  async function fetchIp() {
    const response = await fetch(
      `https://device-address-api${testMode ? '-sb' : ''}.wbc.mspenv.io/v1/${serialNumber}/ip`,
      {
        headers: {
          'ASM-MSP-DEVICE-ADDRESS-API-KEY': apiKey,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setIp(data.ip);
      setTimeStampIp(data.last_updated);
      setResult('success');
    } else {
      const data = await response.json();
      setErrorResponse(data);
      setResult('error');
    }
  }
  function webSocketFqdn(webFqdn: any) {
    const connection = new Connection('wss://321-490-753.z1.sandbox.apdvcs.net');
    connection.Connect();

    // const socket = new WebSocket('wss://321-490-753.z1.sandbox.apdvcs.net');
    // console.log('init ws socket ', webFqdn);
    // socket.onopen = function (e: any) {
    //   console.log('[open] Connection established');
    //   console.log('Sending to server');
    //   socket.send('success');
    // };
    // socket.onerror = function (error: any) {
    //   console.log(`[error] ${error.message}`);
    // };
  }

  return (
    <div className="w-100 p-3">
      <h2 className="sub-header">L2 Support and/or Merchants to test auto address</h2>
      <div className="w-50 m-auto">
        <Input
          id="inpSerialNum"
          name="Serial Number"
          label="Serial Number"
          placeholder="Serial Number"
          required
          onChange={(e: any) => {
            setSerialNumber(e.target.value);
            setResult('');
          }}
        />
        <Input
          id="inpApiKey"
          name="Api Key"
          label="Api Key"
          placeholder="Api Key"
          required
          onChange={(e: any) => {
            setApiKey(e.target.value);
            setResult('');
          }}
        />
        <Checkbox
          type="checkbox"
          id="ckbTestMode"
          label="Test Mode"
          checked={testMode}
          onChange={() => {
            setTestMode(!testMode);
            setResult('');
          }}
        />
        <button type="button" className="primary-button" onClick={() => fetchResponse()}>
          Resolve
        </button>
      </div>
      {result === 'success' && (
        <div>
          <h2 className="sub-header">Result</h2>
          <Row>
            <Col sm={6}>
              <h5 className="text-center">Device Address Api</h5>
              <Table>
                <tbody>
                  <tr>
                    <th>Environment</th>
                    <td>{testMode ? 'Sandbox' : 'Production'}</td>
                  </tr>
                  <tr>
                    <th>IP</th>
                    <td>{ip}</td>
                  </tr>
                  <tr>
                    <th>FQDN</th>
                    <td>{fqdn}</td>
                  </tr>
                  <tr>
                    <th>Last Updated Fqdn</th>
                    <td>{timeStampFqdn}</td>
                  </tr>
                  <tr>
                    <th>Last Updated ip</th>
                    <td>{timeStampIp}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
            <Col sm={6}>
              <h5 className="text-center">Google Api</h5>
              <Table>
                <tbody>
                  <tr>
                    <th>Google DNS</th>
                    <td>{JSON.stringify(googleDns.Answer[0])}</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>
        </div>
      )}
      {result === 'error' && (
        <div>
          {/* <h2 className="sub-header">Error</h2> */}
          <Alert id="alertMessage" variant="danger" className="text-center">
            Error
          </Alert>
          <Table bordered className="w-50 m-auto">
            <tbody>
              <tr>
                <th className="w-25">Request ID</th>
                <td>{errorResponse.request_id}</td>
              </tr>
              <tr>
                <th>Error Code</th>
                <td>{errorResponse.error_code}</td>
              </tr>
              <tr>
                <th>Error Description</th>
                <td>{errorResponse.error}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default AutoAddressCheck;

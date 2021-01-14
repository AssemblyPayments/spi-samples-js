import React, { useState, useEffect } from 'react';
import { Table, Alert, Row, Col, Container } from 'react-bootstrap';
import { Input } from '../../../components/Input';
import Checkbox from '../../../components/Checkbox';

async function fetchFqdn(
  sn: string,
  tm: boolean,
  setFqdn: any,
  setTimeStampFqdn: any,
  setResult: any,
  setErrorResponse: any,
  setGoogleDns: any,
  setWebSocketConnectionFqdn: any
) {
  const response = await fetch(`https://device-address-api${tm ? '-sb' : ''}.wbc.mspenv.io/v1/${sn}/fqdn`, {
    headers: {
      'ASM-MSP-DEVICE-ADDRESS-API-KEY': 'DADDRTESTTOOL',
    },
  });
  let fqdn;
  if (response.ok) {
    const data = await response.json();
    fqdn = data.fqdn;
    setFqdn(data.fqdn);
    setTimeStampFqdn(data.last_updated);
    setResult('success');
    webSocketFqdn(data.fqdn, sn, tm, setWebSocketConnectionFqdn);
  } else {
    const data = await response.json();
    setErrorResponse(data);
    setResult('error');
  }

  if (response.ok) {
    const dnsResponse = await fetch(`https://dns.google/resolve?name=${fqdn}`);
    if (dnsResponse.ok) {
      const data = await dnsResponse.json();
      if (dnsResponse.ok && data.Answer) {
        setGoogleDns(data);
      } else {
        setGoogleDns('Error in Google Api');
      }
    }
  }
}

async function fetchIp(
  sn: string,
  tm: boolean,
  setIp: any,
  setTimeStampIp: any,
  setResult: any,
  setErrorResponse: any
) {
  const response = await fetch(`https://device-address-api${tm ? '-sb' : ''}.wbc.mspenv.io/v1/${sn}/ip`, {
    headers: {
      'ASM-MSP-DEVICE-ADDRESS-API-KEY': 'DADDRTESTTOOL',
    },
  });

  if (response.ok) {
    const data = await response.json();
    setIp(data.ip);
    setTimeStampIp(data.last_updated);
    setResult('success');
    // Todo
    // webSocketIp(data.ip);
  } else {
    const data = await response.json();
    setErrorResponse(data);
    setResult('error');
  }
}

function webSocketFqdn(webFqdn: any, sn: string, tm: boolean, setWebSocketConnectionFqdn: any) {
  const socket = new WebSocket(`wss://${webFqdn}`, 'spi.2.8.0');

  socket.onopen = (e: any) => {
    socket.send('success');
    setWebSocketConnectionFqdn('Successfully connected to webSocket');
  };

  socket.onerror = (error: any) => {
    setWebSocketConnectionFqdn('Error in connecting to webSocket');
  };
}

function AutoAddressCheck() {
  const [serialNumber, setSerialNumber] = useState('');
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
    Answer: [{ name: '', data: '' }],
  });
  const [webSocketConnectionFqdn, setWebSocketConnectionFqdn] = useState('');
  // Todo
  // const [webSocketConnectionIp, setWebSocketConnectionIp] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const serialNumberFromUrl = params.get('sn');
    const testModeFromUrl = params.get('qa');

    const sn = serialNumberFromUrl === null ? '' : serialNumberFromUrl;
    const tm = testModeFromUrl === 'true';
    setSerialNumber(sn);
    setTestMode(tm);

    if (sn !== '') {
      fetchResponse(sn, tm);
    }
  }, []);
  function fetchResponse(sn: string, tm: boolean) {
    fetchFqdn(sn, tm, setFqdn, setTimeStampFqdn, setResult, setErrorResponse, setGoogleDns, setWebSocketConnectionFqdn);
    fetchIp(sn, tm, setIp, setTimeStampIp, setResult, setErrorResponse);
  }
  // Todo
  // function webSocketIp(webIp: any) {
  //   const socket = new WebSocket(`ws://${webIp}`, `spi.${new SpiService()._version}`);
  //   socket.onopen = (e: any) => {
  //     socket.send('success');
  //     setWebSocketConnectionIp('Successfully connected to webSocket');
  //   };
  //   socket.onerror = (error: any) => {
  //     setWebSocketConnectionIp('Error in connecting to webSocket');
  //   };
  // }

  return (
    <div className="w-100 p-3">
      <h2 className="sub-header">L2 Support and/or Merchants to test auto address</h2>
      <div className="w-50 m-auto">
        <Input
          id="inpSerialNum"
          name="Serial Number"
          label="Serial Number"
          placeholder="Serial Number"
          defaultValue={serialNumber}
          required
          onChange={(e: any) => {
            setSerialNumber(e.target.value);
            setResult('');
          }}
        />
        <Checkbox
          id="ckbTestMode"
          label="Test Mode"
          checked={testMode}
          onChange={() => {
            setTestMode(!testMode);
            setResult('');
          }}
        />
        <button type="button" className="primary-button" onClick={() => fetchResponse(serialNumber, testMode)}>
          Resolve
        </button>
      </div>
      {result === 'success' && (
        <div>
          <h2 className="sub-header">Result</h2>
          <Container>
            <Row>
              <Col xs={12} sm>
                <h5 className="text-center">Device Address API</h5>
                <Table>
                  <tbody>
                    <tr>
                      <th>Environment</th>
                      <td>{testMode ? 'Sandbox' : 'Production'}</td>
                    </tr>
                    <tr>
                      <th>IP</th>
                      <td>
                        <a href={`http://${ip}`} target="_blank" rel="noopener noreferrer">
                          {ip}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <th>FQDN</th>
                      <td>
                        <a href={`https://${fqdn}`} target="_blank" rel="noopener noreferrer">
                          {fqdn}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <th>Last Updated Fqdn</th>
                      <td>{timeStampFqdn}</td>
                    </tr>
                    <tr>
                      <th>Last Updated IP</th>
                      <td>{timeStampIp}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col xs={12} sm>
                <h5 className="text-center">Google API</h5>
                <Table>
                  <tbody>
                    <tr>
                      <th>FQDN</th>
                      <td>{googleDns.Answer && googleDns.Answer.length > 0 ? googleDns.Answer[0].name : googleDns}</td>
                    </tr>
                    <tr>
                      <th>IP</th>
                      <td>{googleDns.Answer && googleDns.Answer.length > 0 ? googleDns.Answer[0].data : googleDns}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col xs={12} sm>
                <h5 className="text-center">Web Socket Connection</h5>
                <Table>
                  <tbody>
                    <tr>
                      <th>FQDN</th>
                      <td>{webSocketConnectionFqdn}</td>
                    </tr>
                    {/* <tr>
                    <th>IP</th>
                    <td>{webSocketConnectionIp}</td>
                  </tr> */}
                  </tbody>
                </Table>
              </Col>
            </Row>
          </Container>
        </div>
      )}
      {result === 'error' && (
        <div>
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

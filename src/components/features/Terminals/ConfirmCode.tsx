import React from 'react';

function ConfirmCode() {
  return (
    <form className="w-50 col-lg-6 offset-lg-3 shadow-lg p-3 mb-5 bg-white">
      <div className="text-center">
        <h4>Confirm Pairing Code</h4>
        <p>Please confirm the following code is shown on the EFTPOS terminal:</p>
        <p>Code here</p>
        <button type="submit" className="btn btn-primary rounded-0 btn-block btn-lg mb-2 w-50 col-lg-6 offset-lg-3">
          Cancel
        </button>
        <br />
      </div>
    </form>
  );
}

export default ConfirmCode;

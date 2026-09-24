import React from 'react';

const RingCentralConnect = () => {
  const clientId = process.env.NEXT_PUBLIC_RC_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_RC_REDIRECT_URI;
  const serverUrl = process.env.NEXT_PUBLIC_RC_SERVER_URL;
 const handleConnect = () => {
    const authUrl = `${serverUrl}/restapi/oauth/authorize?` +
      new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state: 'xyz123', // optional CSRF token
      });

    window.location.href = authUrl;
  };

  return (
    <button onClick={handleConnect} className="btn btn-primary">
      Connect RC
    </button>
  );
};

export default RingCentralConnect;
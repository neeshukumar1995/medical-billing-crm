import getIcon from "@/utils/getIcon";

export const microsoftLogin = () => {
  const state = Math.random().toString(36).substring(2) + Date.now();

  sessionStorage.setItem("oauth_state", state);

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  window.location.href =
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
    `?client_id=${process.env.NEXT_PUBLIC_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(
      "openid profile email offline_access Mail.Read Mail.Send User.Read"
    )}` +
    `&state=${state}`;
};


const OutlookConnectButton = () => {
  return (
    <a href="#" className="nxl-link" onClick={(e) => { e.preventDefault(); microsoftLogin(); }}>
      <span className="nxl-micon">
        {getIcon('feather-mail')}
      </span>
      <span className="nxl-mtext">Login with Outlook</span>
    </a>
  );
};

export default OutlookConnectButton;
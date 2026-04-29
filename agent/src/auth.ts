
import { PublicClientApplication } from "@azure/msal-browser";

const VITE_ENTRA_APP_CLIENT_ID = import.meta.env.VITE_ENTRA_APP_CLIENT_ID!;
const VITE_ENTRA_APP_TENANT_ID = import.meta.env.VITE_ENTRA_APP_TENANT_ID!;

const base = import.meta.env.BASE_URL;

const msalConfig = {
  auth: {
    clientId: VITE_ENTRA_APP_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${VITE_ENTRA_APP_TENANT_ID}`,
    redirectUri: window.location.origin + base,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

const scopes = [`api://${VITE_ENTRA_APP_CLIENT_ID}/access_as_user`];

const msalInstance = new PublicClientApplication(msalConfig);

export async function getToken() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    // Not logged in — trigger redirect
    await msalInstance.loginRedirect({ scopes });
    return null;
  }

  const response = await msalInstance.acquireTokenSilent({
    scopes,
    account: accounts[0]!,
  });

  return response.accessToken;
}
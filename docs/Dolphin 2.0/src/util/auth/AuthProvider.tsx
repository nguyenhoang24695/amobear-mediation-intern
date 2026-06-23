import { createContext, useEffect, useRef, useState } from "react";
import AdMobAPI from "../api/AdMobAPI";
import PublisherAccount from "../../types/admob/PublisherAccount";

const CLIENT_ID = "<YOUR_CLIENT_ID>";

const SCOPES =
  "https://www.googleapis.com/auth/admob.monetization https://www.googleapis.com/auth/admob.readonly https://www.googleapis.com/auth/userinfo.profile";

export interface AuthContextType {
  isSignedIn: boolean;
  isLoading: boolean;
  username?: string;
  login: () => void;
  signout: () => void;
  /** new — used by AdMobAPI */
  getAccessToken: () => Promise<string>;
  account?: PublisherAccount;
}

export const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>();
  const [account, setAccount] = useState<PublisherAccount>();

  // ⏳ token cache identical to your old code
  const tokenCache = useRef<{ token: string; expiry: number } | null>(null);
  const refreshPromise = useRef<Promise<string> | null>(null);
  const tokenClient = useRef<ReturnType<
    typeof google.accounts.oauth2.initTokenClient
  > | null>(null);

  /** 1️⃣ boot - load GIS and create token client */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = script.defer = true;
    script.onload = () => {
      tokenClient.current = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        // 👇 1. give resp an explicit type
        callback: async (resp: any) => {
          if (resp.error) {
            console.error(resp);
            setIsLoading(false);
            return;
          }
          tokenCache.current = {
            token: resp.access_token,
            expiry: Date.now() + resp.expires_in * 1000,
          };
          setIsSignedIn(true);
          // tiny profile lookup — optional

          setIsLoading(false);

          AdMobAPI.setTokenProvider(getAccessToken);

          const pubAccount = (await AdMobAPI.listAccounts()).account;
          setAccount(pubAccount[0]);
        },
      });

      const attemptSilent = () => {
        setIsLoading(true);
        tokenClient.current!.requestAccessToken({ prompt: "" }); // <= no UI
      };

      attemptSilent(); // 🔸 first page load
      setIsLoading(false);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  /** 2️⃣ login popup (first-time) */
  const login = () => {
    setIsLoading(true);
    tokenClient.current?.requestAccessToken({ prompt: "consent" });
  };

  /** 3️⃣ sign-out = revoke + local cleanup */
  const signout = () => {
    const t = tokenCache.current?.token;
    if (t) {
      google.accounts.oauth2.revoke(t, () => {});
    }
    tokenCache.current = null;
    setIsSignedIn(false);
    setUsername(undefined);
  };

  /** 4️⃣ AdMobAPI calls this whenever it needs a token */
  const getAccessToken = async (): Promise<string> => {
    const now = Date.now();
    if (tokenCache.current && now < tokenCache.current.expiry) {
      return tokenCache.current.token;
    }
    if (refreshPromise.current) return refreshPromise.current;

    refreshPromise.current = new Promise<string>((resolve, reject) => {
      tokenClient.current!.callback = (resp: any) => {
        refreshPromise.current = null;
        if (resp.error) return reject(resp);
        tokenCache.current = {
          token: resp.access_token,
          expiry: Date.now() + resp.expires_in * 1000,
        };
        resolve(resp.access_token);
      };
      tokenClient.current!.requestAccessToken({ prompt: "" }); // silent
    });
    return refreshPromise.current;
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        isLoading,
        username,
        login,
        signout,
        getAccessToken,
        account,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

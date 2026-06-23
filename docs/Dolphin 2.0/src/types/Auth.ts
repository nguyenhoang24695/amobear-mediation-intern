import PublisherAccount from "./admob/PublisherAccount";

export type Auth = {
  isSignedIn: boolean;
  isLoading: boolean;
  username: string | undefined;
  login: () => void;
  signout: () => void;
  account?: PublisherAccount;
};

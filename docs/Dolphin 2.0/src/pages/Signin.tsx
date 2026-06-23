import { AppProvider } from "@toolpad/core/AppProvider";
import { SignInPage, type AuthProvider } from "@toolpad/core/SignInPage";
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import { AuthContext } from "../util/auth/AuthProvider";

// preview-start
const providers = [{ id: "google", name: "Google" }];
// preview-end

export default function SignIn() {
  const { login } = useContext(AuthContext);

  const authenticate: (provider: AuthProvider) => void = async (provider) => {
    const promise = new Promise<void>((resolve) => {
      setTimeout(() => {
        login();
        resolve();
      }, 500);
    });
    return promise;
  };

  const theme = useTheme();
  return (
    // preview-start
    <AppProvider theme={theme}>
      <SignInPage signIn={authenticate} providers={providers} />
    </AppProvider>
    // preview-end
  );
}

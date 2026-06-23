import { useContext } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import SignIn from "./Signin";
import Loading from "../components/Loading";
import Nav from "./Nav";
import { AuthContext, AuthProvider } from "../util/auth/AuthProvider";

const Navigator = () => {
  const { isSignedIn, isLoading } = useContext(AuthContext);

  if (isLoading) return <Loading />;
  if (isSignedIn) {
    return <Nav />;
  } else {
    return (
      <Routes>
        <Route path="*" element={<SignIn />} />
      </Routes>
    );
  }
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navigator />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

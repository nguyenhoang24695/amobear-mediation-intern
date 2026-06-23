import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { createTheme } from "@mui/material/styles";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SettingsCartIcon from "@mui/icons-material/Settings";
import ScienceIcon from "@mui/icons-material/Science";
import DoorBackOutlinedIcon from "@mui/icons-material/DoorBackOutlined";
import { AppProvider, type Navigation } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { useDemoRouter } from "@toolpad/core/internal";
import Home from "./Home";
import LogoIcon from "../components/LogoIcon";
import App from "../types/App";
import MediationGroup from "../types/admob/MediationGroup";
import AdSource from "../types/admob/AdSource";
import AdMobAPI from "../util/api/AdMobAPI";
import Loading from "../components/Loading";
import Configuration from "./Configuration";
import AdUnit from "../types/admob/AdUnit";
import { useCallback, useContext, useEffect, useState } from "react";
import { AuthContext } from "../util/auth/AuthProvider";
import Experiments from "./Experiments";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CSVUpload from "./CSVUpload";

const NAVIGATION: Navigation = [
  { segment: "dashboard", title: "Dashboard", icon: <DashboardIcon /> },
  // { segment: "csv-upload", title: "CSV Upload", icon: <UploadFileIcon /> },
  {
    segment: "configuration",
    title: "Configuration",
    icon: <SettingsCartIcon />,
  },
  {
    segment: "experiments",
    title: "Experiments",
    icon: <ScienceIcon />,
  },
  { segment: "logout", title: "Log out", icon: <DoorBackOutlinedIcon /> },
];

const demoTheme = createTheme({
  cssVariables: { colorSchemeSelector: "data-toolpad-color-scheme" },
  colorSchemes: { light: true, dark: true },
  breakpoints: { values: { xs: 0, sm: 600, md: 600, lg: 1200, xl: 1536 } },
});

function LogoutPage() {
  const { signout } = useContext(AuthContext);
  const [open, setOpen] = useState(true);

  const handleConfirm = () => {
    setOpen(false);
    signout();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleCancel}>
      <DialogTitle>Log Out</DialogTitle>
      <DialogContent>
        <DialogContentText>Are you sure you want to log out?</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleConfirm} color="primary">
          Log Out
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type PubData = {
  apps: { [key: string]: App };
  adUnits: { [key: string]: AdUnit };
  mediationGroups: { [key: string]: MediationGroup };
  adSources: { [key: string]: AdSource };
};

function DemoPageContent({
  pathname,
  data,
}: {
  pathname: string;
  data: PubData;
}) {
  // Render the appropriate page based on the pathname
  switch (pathname) {
    case "/dashboard":
      return <Home data={data} />;
    case "/csv-upload":
      return <CSVUpload data={data} />;
    case "/configuration":
      return <Configuration data={data} />;
    case "/experiments":
      return <Experiments data={data} />;
    case "/logout":
      return <LogoutPage />;
    default:
      return (
        <Box
          sx={{
            py: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography>Page not found</Typography>
        </Box>
      );
  }
}

interface DemoProps {
  /**
   * Injected by the documentation to work in an iframe.
   * Remove this when copying and pasting into your project.
   */
  window?: () => Window;
}

export default function Nav(props: DemoProps) {
  const { window } = props;

  const router = useDemoRouter("/dashboard");

  // Remove this const when copying and pasting into your project.
  const demoWindow = window !== undefined ? window() : undefined;

  const { account } = useContext(AuthContext);
  const [apps, setApps] = useState<{ [key: string]: App }>();
  const [adUnits, setAdUnits] = useState<{ [key: string]: AdUnit }>();
  const [mediationGroups, setMediationGroups] = useState<{
    [key: string]: MediationGroup;
  }>();
  const [adSources, setAdSources] = useState<{ [key: string]: AdSource }>();

  const fetchAdSources = useCallback(async () => {
    if (!account) return;
    const adSourcesData = await AdMobAPI.listAdSources(account.name);
    const objGroups = adSourcesData.adSources.reduce((acc: any, obj) => {
      acc[obj.adSourceId!] = obj;
      return acc;
    }, {});
    setAdSources(objGroups);
  }, [account]);

  const fetchMediationGroups = useCallback(async () => {
    if (!account) return;
    const mgData = await AdMobAPI.listMediationGroups(account.name);
    const objGroups = mgData.mediationGroups?.reduce((acc: any, obj) => {
      acc[obj.mediationGroupId!] = obj;
      return acc;
    }, {});
    setMediationGroups(objGroups);
  }, [account]);

  const fetchApps = useCallback(async () => {
    if (!account) return;
    const { apps: rawApps } = await AdMobAPI.listApps(account.name);
    const filtered = rawApps
      .filter((i) => "linkedAppInfo" in i)
      .map((i) => {
        if (!i.linkedAppInfo!.iconUri) {
          i.linkedAppInfo!.iconUri = "images/templateApp.png";
        }
        return i;
      });
    const objApps = filtered.reduce((acc: any, obj) => {
      acc[obj.appId] = obj;
      return acc;
    }, {});
    setApps(objApps);
  }, [account]);

  const fetchAdUnits = useCallback(async () => {
    if (!account) return;
    const { adUnits: rawUnits } = await AdMobAPI.listAdUnits(account.name);
    const objUnits = rawUnits.reduce((acc: any, obj) => {
      acc[obj.adUnitId] = obj;
      return acc;
    }, {});
    setAdUnits(objUnits);
  }, [account]);

  // 2) Now listData only changes when one of the four above does:
  const listData = useCallback(async () => {
    await fetchApps();
    await fetchMediationGroups();
    await fetchAdSources();
    await fetchAdUnits();
  }, [fetchApps, fetchMediationGroups, fetchAdSources, fetchAdUnits]);

  // 3) Finally, run that effect when listData changes:
  useEffect(() => {
    listData();
  }, [listData]);

  if (!apps || !adSources || !mediationGroups || !adUnits) return <Loading />;

  return (
    <AppProvider
      navigation={NAVIGATION}
      router={router}
      theme={demoTheme}
      window={demoWindow}
      branding={{
        logo: <LogoIcon />,
        title: "Dolphin 2.0 | Hybrid Builder | Version 29.10.25",
      }}
    >
      <DashboardLayout>
        <DemoPageContent
          pathname={router.pathname}
          data={{ mediationGroups, apps, adSources, adUnits }}
        />
      </DashboardLayout>
    </AppProvider>
  );
}

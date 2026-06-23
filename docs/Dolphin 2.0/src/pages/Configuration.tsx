import { useState, useEffect } from "react";
import styled from "styled-components";
import {
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Chip,
} from "@mui/material";
import { PubData } from "./Nav";
import Configurations from "../types/Configurations";
import { BiddingNetworkID, WaterfallNetworkID } from "../types/Networks";

interface AdSourceField {
  name: string;
  label: string;
  type: string;
}

interface AdSourceDefinition {
  id: string;
  name: string;
  fields: AdSourceField[];
  requiresAllowlist?: boolean;
}

// Define ad sources within the same file
const adSourcesData: AdSourceDefinition[] = [
  {
    id: WaterfallNetworkID.AdMob,
    name: "AdMob Network Waterfall",
    fields: [],
  },
  {
    id: WaterfallNetworkID.LiftOff,
    name: "LiftOff",
    fields: [{ name: "apiKey", label: "Secret Token", type: "text" }],
    requiresAllowlist: true, // LiftOff requires allowlist
  },
  {
    id: BiddingNetworkID.LiftOff,
    name: "LiftOff (Bidding)",
    fields: [{ name: "apiKey", label: "Secret Token", type: "text" }],
  },
  {
    id: WaterfallNetworkID.InMobi,
    name: "InMobi",
    fields: [
      { name: "clientSecret", label: "Client Secret", type: "text" },
      { name: "accountId", label: "Account ID", type: "text" },
      { name: "clientId", label: "Client ID", type: "text" },
    ],
  },
  {
    id: BiddingNetworkID.InMobi,
    name: "InMobi SDK (Bidding)",
    fields: [
      { name: "clientSecret", label: "Client Secret", type: "text" },
      { name: "accountId", label: "Account ID", type: "text" },
      { name: "clientId", label: "Client ID", type: "text" },
    ],
  },
  {
    id: WaterfallNetworkID.ChartBoost,
    name: "ChartBoost (V5)",
    fields: [
      { name: "clientSecret", label: "Client Secret", type: "text" },
      { name: "clientId", label: "Client ID", type: "text" },
    ],
  },

  {
    id: WaterfallNetworkID.Pangle,
    name: "Pangle",
    fields: [
      { name: "userId", label: "User ID", type: "text" },
      { name: "roleId", label: "Role ID", type: "text" },
      { name: "securityKey", label: "Security Key", type: "text" },
    ],
  },

  {
    id: BiddingNetworkID.Pangle,
    name: "Pangle (Bidding)",
    fields: [
      { name: "userId", label: "User ID", type: "text" },
      { name: "roleId", label: "Role ID", type: "text" },
      { name: "securityKey", label: "Security Key", type: "text" },
    ],
  },

  {
    id: WaterfallNetworkID.Mintegral,
    name: "Mintegral",
    fields: [
      { name: "skey", label: "Security Key", type: "text" },
      { name: "secret", label: "Secret", type: "text" },
      { name: "appKey", label: "App Key", type: "text" },
    ],
    requiresAllowlist: true, // Mintegral requires allowlist
  },

  {
    id: BiddingNetworkID.Mintegral,
    name: "Mintegral (Bidding)",
    fields: [
      { name: "skey", label: "Security Key", type: "text" },
      { name: "secret", label: "Secret", type: "text" },
      { name: "appKey", label: "App Key", type: "text" },
    ],
  },

  // Add other ad sources as needed
];
interface PropTypes {
  data: PubData;
}

const Configuration = ({ data }: PropTypes) => {
  const [adSources] = useState<AdSourceDefinition[]>(adSourcesData);
  const [configurations, setConfigurations] = useState<Configurations>(() => {
    // Load configurations from localStorage if available
    const storedConfigs = localStorage.getItem("configurations");
    return storedConfigs ? JSON.parse(storedConfigs) : {};
  });
  const [configuredSources, setConfiguredSources] = useState<
    AdSourceDefinition[]
  >([]);
  const [unconfiguredSources, setUnconfiguredSources] = useState<
    AdSourceDefinition[]
  >([]);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [selectedAdSource, setSelectedAdSource] =
    useState<AdSourceDefinition | null>(null);
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({});

  // Save configurations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("configurations", JSON.stringify(configurations));
  }, [configurations]);

  // Update configured and unconfigured lists whenever configurations change
  useEffect(() => {
    const configured: AdSourceDefinition[] = [];
    const unconfigured: AdSourceDefinition[] = [];

    adSources.forEach((source) => {
      if (configurations[source.id]) {
        configured.push(source);
      } else {
        unconfigured.push(source);
      }
    });

    setConfiguredSources(configured);
    setUnconfiguredSources(unconfigured);
  }, [adSources, configurations]);

  const handleConfigure = (adSource: AdSourceDefinition) => {
    setSelectedAdSource(adSource);
    setFormValues(configurations[adSource.id] || {});
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedAdSource(null);
    setFormValues({});
  };

  const handleInputChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues({
        ...formValues,
        [field]: event.target.value,
      });
    };

  const handleSaveConfiguration = () => {
    if (!selectedAdSource) return;

    const updatedConfigurations: Configurations = {
      ...configurations,
      [selectedAdSource.id]: formValues,
    };

    setConfigurations(updatedConfigurations);
    handleDialogClose();
  };

  const handleDeleteConfiguration = (adSourceId: string) => {
    const updatedConfigurations = { ...configurations };
    delete updatedConfigurations[adSourceId];
    setConfigurations(updatedConfigurations);
  };

  return (
    <View>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure your ad networks below. Ensure you have the necessary API keys
        and credentials for each network.
        <br />
        <br />
        <strong>Note:</strong> Credentials are stored in your{" "}
        <strong>browser's local storage</strong> and will be available across
        sessions. You can edit or remove configurations at any time.
      </Alert>
      <Box>
        <Typography gutterBottom variant="h6" component="div">
          Configured Bidding Networks
        </Typography>
        {configuredSources.filter((item) => item.name.includes("Bidding"))
          .length === 0 && (
          <Typography variant="body1">No configured ad networks.</Typography>
        )}
        {configuredSources
          .filter((item) => item.name.includes("Bidding"))
          .map((source) => (
            <ListItem key={source.id} component="div" disablePadding>
              <ListItemButton onClick={() => handleConfigure(source)}>
                <ListItemText primary={`${source.name}`} />
              </ListItemButton>
              <Button
                variant="text"
                color="secondary"
                onClick={() => handleDeleteConfiguration(source.id)}
              >
                Remove
              </Button>
            </ListItem>
          ))}
      </Box>

      <Box>
        <Typography gutterBottom variant="h6" component="div">
          Configured Waterfall Networks
        </Typography>
        {configuredSources.filter((item) => !item.name.includes("Bidding"))
          .length === 0 && (
          <Typography variant="body1">No configured ad networks.</Typography>
        )}
        {configuredSources
          .filter((item) => !item.name.includes("Bidding"))
          .map((source) => (
            <ListItem key={source.id} component="div" disablePadding>
              <ListItemButton
                onClick={() => handleConfigure(source)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  height: "50px",
                }}
              >
                <Typography>{`${source.name}`}</Typography>

                {source.requiresAllowlist && (
                  <Chip
                    label="Requires Allowlist"
                    color="error"
                    size="small"
                    sx={{ width: "150px", ml: 2 }}
                  />
                )}
              </ListItemButton>
              <Button
                variant="text"
                color="secondary"
                onClick={() => handleDeleteConfiguration(source.id)}
              >
                Remove
              </Button>
            </ListItem>
          ))}
      </Box>
      <Box>
        <Typography gutterBottom variant="h6" component="div">
          Unconfigured Bidding Networks
        </Typography>
        {unconfiguredSources.filter((item) => item.name.includes("Bidding"))
          .length === 0 && (
          <Typography variant="body1">
            All ad networks are configured.
          </Typography>
        )}
        {unconfiguredSources
          .filter((item) => item.name.includes("Bidding"))
          .map((source) => (
            <ListItem key={source.id} component="div" disablePadding>
              <ListItemButton onClick={() => handleConfigure(source)}>
                <ListItemText primary={`${source.name}`} />
              </ListItemButton>
            </ListItem>
          ))}
      </Box>
      <Box>
        <Typography gutterBottom variant="h6" component="div">
          Unconfigured Waterfall Networks
        </Typography>
        {unconfiguredSources.filter((item) => !item.name.includes("Bidding"))
          .length === 0 && (
          <Typography variant="body1">
            All ad networks are configured.
          </Typography>
        )}
        {unconfiguredSources
          .filter((item) => !item.name.includes("Bidding"))
          .map((source) => (
            <ListItem key={source.id} component="div" disablePadding>
              <ListItemButton
                onClick={() => handleConfigure(source)}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  height: "50px",
                }}
              >
                <Typography>{`${source.name}`}</Typography>

                {source.requiresAllowlist && (
                  <Chip
                    label="Requires Allowlist"
                    color="error"
                    size="small"
                    sx={{ width: "150px", ml: 2 }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
      </Box>

      {/* Configuration Dialog */}
      {selectedAdSource && (
        <Dialog open={openDialog} onClose={handleDialogClose}>
          <DialogTitle>Configure {selectedAdSource.name}</DialogTitle>
          <DialogContent style={{ maxWidth: "600px", minWidth: "400px" }}>
            {selectedAdSource.fields.map((field) => (
              <TextField
                key={field.name}
                margin="dense"
                label={field.label}
                type={field.type}
                fullWidth
                value={formValues[field.name] || ""}
                onChange={handleInputChange(field.name)}
              />
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSaveConfiguration} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </View>
  );
};

export default Configuration;

const View = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  flex-direction: column;
`;

const Box = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-top: 16px;
`;

import { Box, Paper, Stack } from "@mui/material";
import MediationGroup from "../types/admob/MediationGroup";
import { PubData } from "../pages/Nav";

interface Proptypes {
  /** Current ad format selected upstream */
  mediationGroup: MediationGroup;
  data: PubData;
}

//

// ────────────────────────────────────────────────────────────────────────────────
export default function MediationGroupDetails({
  mediationGroup,
  data,
}: Proptypes) {
  // ──────────────────────────────────────────────────────────────────────────────

  const getIcons = () => {
    const ids = mediationGroup.targeting!.adUnitIds;
    const appIds = ids?.map((id) => data.adUnits[id].appId);
    const apps = appIds?.map((id) => data.apps[id]);
    const icons = apps
      ?.map((app) => app?.linkedAppInfo?.iconUri ?? "")
      .filter((icon) => icon !== "");

    return icons ?? [];
  };
  return (
    <Paper sx={{ width: "100%" }}>
      <Box
        sx={{
          p: 2,
          width: "100%",
          minWidth: "300px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flexShrink: 0,
          bgcolor: "background.paper",
          overflowY: "scroll",
          maxHeight: "100%",
        }}
      >
        <Stack spacing={1.5} style={{ marginTop: 16 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              typography: "subtitle2",
              justifyContent: "space-between",
            }}
          >
            {mediationGroup.displayName}
          </Box>

          <Box
            sx={{
              display: "flex",
              typography: "caption",
              textTransform: "capitalize",
            }}
          >
            <Box component="span" sx={{ width: "100%" }}>
              Meidation Group ID:
            </Box>
            {mediationGroup.mediationGroupId}
          </Box>
          <Box
            sx={{
              display: "flex",
              typography: "caption",
              textTransform: "capitalize",
            }}
          >
            <Box component="span" sx={{ width: "100%" }}>
              Format
            </Box>
            {mediationGroup.targeting?.format}
          </Box>
          <Box
            sx={{
              display: "flex",
              typography: "caption",
              textTransform: "capitalize",
            }}
          >
            <Box component="span" sx={{ width: "100%" }}>
              Platform
            </Box>
            {mediationGroup.targeting?.platform}
          </Box>
          <Box
            sx={{
              display: "flex",
              typography: "caption",
              textTransform: "capitalize",
            }}
          >
            <Box component="span" sx={{ width: "100%" }}>
              A/B Test State
            </Box>
            {mediationGroup.mediationAbExperimentState}
          </Box>

          <Box
            sx={{
              display: "flex",
              typography: "caption",
              textTransform: "capitalize",
            }}
          >
            <Box component="span" sx={{ width: "100%" }}>
              Apps
            </Box>
            {getIcons().map((icon, index) => (
              <img
                key={index}
                src={icon}
                alt={`App Icon ${index}`}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                style={{
                  width: 30,
                  height: 30,
                  marginLeft: 16,
                  borderRadius: 5,
                }}
              />
            ))}
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}

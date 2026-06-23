import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Grid,
} from "@mui/material";
import Header from "./Header";

interface PropTypes {
  metrics: { cpm: string; earnings: string; matchRate: string };
}

const MetricsView = ({ metrics }: PropTypes) => {
  return (
    <Box>
      <Header
        title="Metrics"
        select={<MenuItem value="Weekly">Last 7 days</MenuItem>}
      />
      <br />
      <Box>
        <Grid container spacing={3} justifyContent="center">
          {[
            { label: "Est. Earnings", value: metrics.earnings },
            { label: "Observed eCPM", value: metrics.cpm },
            { label: "Match Rate", value: metrics.matchRate },
          ].map((metric, index) => (
            <Card key={index} style={{ width: "30%" }}>
              <CardContent>
                <Typography variant="h6" color="textSecondary">
                  {metric.label}
                </Typography>
                <Typography variant="h4" color="primary">
                  {metric.value}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default MetricsView;

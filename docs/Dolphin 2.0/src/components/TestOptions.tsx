import { Paper, Box, TextField, Slider, Typography } from "@mui/material";
import { useState, useEffect } from "react";

export interface TestOptionsType {
  testName: string;
  userAllocation: string;
}

interface PropTypes {
  setTestOptions: (options: TestOptionsType) => void;
}

export default function TestOptions({ setTestOptions }: PropTypes) {
  const [testName, setTestName] = useState("");
  const [userAllocation, setUserAllocation] = useState(50);

  useEffect(() => {
    setTestOptions({
      testName,
      userAllocation: userAllocation.toString(),
    });
  }, [testName, userAllocation, setTestOptions]);

  return (
    <Paper sx={{ width: "100%", p: 2 }}>
      <Box display="flex" flexDirection="column" gap={3}>
        <TextField
          label="Test Name"
          variant="outlined"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          fullWidth
        />

        <Box>
          <Typography gutterBottom>User Allocation (% of users)</Typography>
          <Slider
            value={userAllocation}
            onChange={(_, value) => setUserAllocation(value as number)}
            min={1}
            max={50}
            valueLabelDisplay="on"
          />
        </Box>
      </Box>
    </Paper>
  );
}

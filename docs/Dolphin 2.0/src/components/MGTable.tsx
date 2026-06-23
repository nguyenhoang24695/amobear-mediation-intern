import { DataGrid, GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import MediationGroupLine from "../types/admob/MediationGroupLine";
import AdSource from "../types/admob/AdSource";

const columns: GridColDef[] = [
  { field: "name", headerName: "Name", width: 200 },
  { field: "adSource", headerName: "Ad Source", width: 200 },
  {
    field: "cpmMicros",
    headerName: "eCPM",
    type: "number",
    width: 200,
  },
];

const paginationModel = { page: 0, pageSize: 5 };

interface Proptypes {
  lines: { [key: string]: MediationGroupLine } | undefined;
  adSources: {
    [key: string]: AdSource;
  };
}

export default function MGTable({ lines, adSources }: Proptypes) {
  const getRows = () => {
    const values = Object.values(lines ?? {});

    return values
      .filter((item) => item.cpmMicros)
      .map((item) => {
        return {
          id: item.id,
          name: item.displayName,
          adSource: adSources[item.adSourceId ?? ""].title,
          cpmMicros: "$" + parseInt(item.cpmMicros ?? "0") / 1000000,
        };
      });
  };

  return (
    <Paper sx={{ maxHeight: 500, width: "100%" }}>
      <DataGrid
        rows={getRows()}
        columns={columns}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        checkboxSelection
        sx={{ border: 0 }}
      />
    </Paper>
  );
}

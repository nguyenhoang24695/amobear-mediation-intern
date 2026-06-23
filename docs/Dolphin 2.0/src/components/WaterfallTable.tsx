import { useState, useEffect } from "react";
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridRowModes,
  GridActionsCellItem,
  GridRowId,
  GridRowModel,
  GridCellParams,
} from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import AdSource from "../types/admob/AdSource";
import Configurations from "../types/Configurations";
import MediationGroup from "../types/admob/MediationGroup";
import { WaterfallNetworkID } from "../types/Networks";
import { DraftChanges } from "../util/useWaterfallChanges";

interface AdSourceOption {
  id: string;
  title: string;
  isBidding: boolean;
}

interface RowData {
  id: string;
  name: string;
  adSourceId: string;
  adSource: string;
  cpm: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface Proptypes {
  mediationGroup: MediationGroup;
  adSources: Record<string, AdSource>;
  onChanges: (changes: DraftChanges) => void; // <- strong type
}

export default function WaterfallTable({
  mediationGroup,
  adSources,
  onChanges,
}: Proptypes) {
  const [configurations] = useState<Configurations>(() => {
    // Load configurations from localStorage if available
    const storedConfigs = localStorage.getItem("configurations");
    return storedConfigs ? JSON.parse(storedConfigs) : {};
  });

  const [configuredSources, setConfiguredSources] = useState<{
    [key: string]: AdSource;
  }>({}); // Initialize with empty object

  useEffect(() => {
    const result = Object.keys(configurations)
      .map((item) => ({ id: item, adSource: adSources[item] }))
      .reduce((acc: any, { id, adSource }) => {
        acc[id] = adSource;
        return acc;
      }, {});

    setConfiguredSources(result);
  }, [configurations, adSources]); // Include adSources in dependency array

  useEffect(() => {
    onChanges({});
  }, [mediationGroup, onChanges]);

  const [rows, setRows] = useState<RowData[]>(
    Object.values(mediationGroup.mediationGroupLines ?? {})
      .sort(
        (a, b) => parseInt(b?.cpmMicros ?? "") - parseInt(a?.cpmMicros ?? "")
      )
      .filter((item) => item.cpmMicros)
      .map((item) => {
        const cpmMicrosString = item.cpmMicros ?? "0";
        const cpmMicrosFloat = parseFloat(cpmMicrosString);
        const cpmValue = cpmMicrosFloat / 1_000_000; // Convert micros to dollars

        return {
          id: item.id!,
          name: item.displayName!,
          adSourceId: item.adSourceId ?? "",
          adSource: adSources[item.adSourceId ?? ""]?.title || "Unknown",
          cpm: cpmValue, // Store eCPM in dollars as a float
        };
      })
  );

  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const configuredAdSourceOptions: AdSourceOption[] = Object.keys(
    configuredSources
  )
    .map((key) => {
      const adSource = adSources[key];
      return {
        ...adSource,
        id: key,
        isBidding: adSource?.title?.includes("(bidding)"),
      };
    })
    .filter((item) => !item.isBidding);

  // Utility to check if a row exists in lines
  const isExistingRow = (id: string): boolean =>
    !!mediationGroup.mediationGroupLines?.[id];

  // Utility to check if an existing row is edited
  const isEditedRow = (row: RowData): boolean => {
    if (!isExistingRow(row.id)) return false;
    const original = mediationGroup.mediationGroupLines?.[row.id];
    if (!original) return false;
    const originalName = original.displayName || "";
    const originalCpmMicros = parseFloat(original.cpmMicros ?? "0");
    const originalCpm = originalCpmMicros / 1_000_000;

    return (
      row.name !== originalName || row.cpm !== originalCpm || !!row.isDeleted
    );
  };

  // Function to collect changes
  useEffect(() => {
    if (!onChanges) {
      return;
    }
    const originalLines = mediationGroup.mediationGroupLines ?? {};
    const changes: Record<string, any> = {};

    rows.forEach((row) => {
      const id = row.id;
      const original = originalLines[id];
      const isExisting = Boolean(original);
      const currentCpmMicros =
        parseFloat(original?.cpmMicros ?? "0") / 1_000_000;

      if (isExisting) {
        if (row.isDeleted) {
          changes[id] = { originalLine: original, type: "delete" };
        } else if (
          row.name !== (original.displayName ?? "") ||
          row.cpm !== currentCpmMicros
        ) {
          const delta: any = {};
          if (row.name !== (original.displayName ?? "")) {
            delta.displayName = row.name;
          }
          if (row.cpm !== currentCpmMicros) {
            delta.cpm = row.cpm;
          }
          changes[id] = {
            originalLine: original,
            type: "edit",
            changes: delta,
          };
        }
      } else if (!row.isDeleted) {
        changes[id] = {
          adSourceId: row.adSourceId,
          cpm: row.cpm,
          displayName: row.name,
          type: "new",
        };
      }
    });

    onChanges(changes);
  }, [rows, mediationGroup.mediationGroupLines, onChanges]);

  // Event handlers
  const handleEditClick = (id: GridRowId) => () => {
    const row = rows.find((row) => row.id === id);
    if (row?.isDeleted) return; // Do not allow editing deleted rows
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit },
    }));
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.View },
    }));
  };

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));
    const editedRow = rows.find((row) => row.id === id);
    if (editedRow?.isNew) {
      setRows((oldRows) => oldRows.filter((row) => row.id !== id));
    }
  };

  const handleDeleteClick = (id: GridRowId) => () => {
    setRows((oldRows) =>
      oldRows.map((row) => (row.id === id ? { ...row, isDeleted: true } : row))
    );
  };

  const handleRevertClick = (id: GridRowId) => () => {
    setRows((oldRows) => {
      const row = oldRows.find((row) => row.id === id);
      if (row?.isNew) {
        // Remove new rows
        return oldRows.filter((row) => row.id !== id);
      } else {
        // Revert changes to original data
        const originalLine = mediationGroup.mediationGroupLines?.[id as string];
        if (!originalLine) return oldRows;
        const cpmMicrosFloat = parseFloat(originalLine.cpmMicros ?? "0");
        const cpmValue = cpmMicrosFloat / 1_000_000;
        const revertedRow: RowData = {
          id: originalLine.id!,
          name: originalLine.displayName!,
          adSourceId: originalLine.adSourceId ?? "",
          adSource:
            adSources[originalLine.adSourceId ?? ""]?.title || "Unknown",
          cpm: cpmValue,
          isDeleted: false,
        };
        return oldRows.map((row) => (row.id === id ? revertedRow : row));
      }
    });
  };

  const [errorState, setErrorState] = useState<string | null>(null); // Error state

  const processRowUpdate = (newRow: GridRowModel) => {
    const updatedRow: RowData = {
      id: newRow.id,
      name: newRow.name || "AdMob Network Waterfall",
      adSource: newRow.adSource || "AdMob Network Waterfall",
      cpm: newRow.cpm,
      adSourceId: newRow.adSourceId || WaterfallNetworkID.AdMob,
      isNew: !isExistingRow(newRow.id),
    };

    // Validation: eCPM must be greater than 0
    if (updatedRow.cpm <= 0) {
      throw new Error("eCPM must be greater than 0");
    }

    // Validation: The combination of adSourceId and cpm must be unique among rows (excluding current row)
    const isDuplicateAdSourceCpm = rows.some(
      (row) =>
        row.id !== updatedRow.id &&
        row.adSourceId === updatedRow.adSourceId &&
        row.cpm === updatedRow.cpm
    );
    if (isDuplicateAdSourceCpm) {
      throw new Error(
        "The eCPM value you entered is already being used in another call to this ad network. Please enter a different value."
      );
    }

    // Proceed with updating rows if validation passes
    setRows((oldRows) =>
      oldRows.map((row) => (row.id === newRow.id ? updatedRow : row))
    );
    return updatedRow;
  };

  const handleProcessRowUpdateError = (error: Error) => {
    setErrorState(error.message);
  };

  const handleRowEditStart = () => {
    setErrorState(null); // Clear error when editing starts
  };

  const handleRowModesModelChange = (newModel: GridRowModesModel) => {
    setRowModesModel(newModel);
  };

  const handleAddNewRow = () => {
    const id = `new-${Math.random()}`;
    setRows((oldRows) => [
      ...oldRows,
      {
        id,
        name: "New Name",
        adSource: "",
        cpm: 0,
        isNew: true,
        adSourceId: "", // Initialize adSourceId
      },
    ]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: "adSource" },
    }));
  };

  const getRowClassName = (params: { row: RowData }) => {
    if (params.row.isDeleted) return "deleted-row"; // Red background
    if (!isExistingRow(params.row.id)) return "new-row"; // Green background
    if (isEditedRow(params.row)) return "edited-row"; // Yellow background
    return ""; // Default background
  };

  const isConfiguredSource = (adSourceId: string): boolean => {
    return !!configuredSources[adSourceId];
  };

  const columns: GridColDef[] = [
    {
      field: "adSourceId",
      headerName: "Ad Source ID",
      flex: 1,
      editable: true,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      editable: true,
      renderEditCell: (params) => {
        const originalValue =
          mediationGroup.mediationGroupLines?.[params.id as string]
            ?.displayName || "";
        return (
          <TextField
            style={{ width: "100%" }}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: "none" }, //  ← solution 2
              "& .MuiOutlinedInput-root": { p: 0 }, // optional: trim inner padding
            }}
            value={
              params.value !== undefined && params.value !== null
                ? params.value
                : ""
            }
            onChange={(event) => {
              params.api.setEditCellValue({
                id: params.id,
                field: "name",
                value: event.target.value,
              });
            }}
            placeholder={originalValue}
          />
        );
      },
    },
    {
      field: "adSource",
      headerName: "Ad Source",
      flex: 1,
      editable: true,
      renderEditCell: (params) =>
        isExistingRow(params.row.id) ? (
          <TextField
            disabled
            value={params.row.adSource}
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: "none" }, //  ← solution 2
              "& .MuiOutlinedInput-root": { p: 0 }, // optional: trim inner padding
            }}
          />
        ) : (
          <Autocomplete
            options={configuredAdSourceOptions}
            getOptionLabel={(option) => option.title ?? "Unknown"}
            value={
              configuredAdSourceOptions.find(
                (option) => option.id === params.row.adSourceId
              ) || null
            }
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              "& .MuiOutlinedInput-root": {
                // restore a bit of vertical space
                px: 0, // keep left/right flush
                py: 0.5, // 4 px top+bottom padding
              },
            }}
            onChange={(_, value) => {
              params.api.setEditCellValue({
                id: params.id,
                field: "adSource",
                value: value?.title,
              });
              params.api.setEditCellValue({
                id: params.id,
                field: "adSourceId",
                value: value?.id,
              });
            }}
            style={{ width: "100%" }}
            renderInput={(paramsInput) => (
              <TextField {...paramsInput} placeholder="Select Ad Source" />
            )}
          />
        ),
    },
    {
      field: "cpm",
      headerName: "eCPM",
      flex: 1,
      editable: true,
      valueParser: (value) => {
        const parsedValue = parseFloat(value);
        return isNaN(parsedValue) ? 0 : parsedValue;
      },
      renderEditCell: (params: GridCellParams) => {
        const originalCpmMicros = parseFloat(
          mediationGroup.mediationGroupLines?.[params.id as string]
            ?.cpmMicros ?? "0"
        );
        const originalCpmValue = (originalCpmMicros / 1_000_000).toString();

        return (
          <TextField
            type="number" // Allow numeric input
            inputMode="decimal" // Enable decimal input
            sx={{
              "& .MuiOutlinedInput-notchedOutline": { border: "none" }, //  ← solution 2
              "& .MuiOutlinedInput-root": { p: 0 }, // optional: trim inner padding
            }}
            onChange={(event) => {
              params.api.setEditCellValue({
                id: params.id,
                field: "cpm",
                value: event.target.value,
              });
              params.api.setEditCellValue({
                id: params.id,
                field: "name",
                value:
                  params.row.adSource + " " + parseFloat(event.target.value),
              });
            }}
            placeholder={originalCpmValue}
          />
        );
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      flex: 1,
      getActions: (params) => {
        const { id, row } = params;
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        const isRowEdited = isEditedRow(row);
        const isRowDeleted = row.isDeleted;
        const isNewRow = row.isNew;
        const isConfigured = isConfiguredSource(row.adSourceId);

        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              onClick={handleSaveClick(id)}
              color="primary"
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              onClick={handleCancelClick(id)}
              color="inherit"
            />,
          ];
        }

        const actions = [];

        if (!isRowDeleted) {
          actions.push(
            <GridActionsCellItem
              icon={<EditIcon />}
              label="Edit"
              onClick={() => {
                if (!isConfigured) {
                  setErrorState(`${row.adSource} is not configured`);
                  return;
                }
                handleEditClick(id)();
              }}
              color="inherit"
            />,
            <GridActionsCellItem
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => {
                if (!isConfigured) {
                  setErrorState(`${row.adSource} is not configured`);

                  return;
                }
                handleDeleteClick(id)();
              }}
              color="inherit"
            />
          );
        }

        if (isRowEdited || isNewRow || isRowDeleted) {
          actions.push(
            <GridActionsCellItem
              icon={<UndoIcon />}
              label="Revert"
              onClick={handleRevertClick(id)}
              color="inherit"
            />
          );
        }

        return actions;
      },
    },
  ];

  return (
    <Paper sx={{ width: "100%" }}>
      {/* Display error message if any */}
      {errorState && (
        <Alert severity="error" onClose={() => setErrorState(null)}>
          {errorState}
        </Alert>
      )}
      <Button
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleAddNewRow}
        sx={{ margin: "10px" }}
      >
        Add Record
      </Button>
      <DataGrid
        rows={rows}
        columns={columns}
        editMode="row"
        rowModesModel={rowModesModel}
        columnVisibilityModel={{ adSourceId: false }}
        onRowModesModelChange={handleRowModesModelChange}
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={handleProcessRowUpdateError}
        onRowEditStart={handleRowEditStart}
        getRowClassName={getRowClassName}
        disableRowSelectionOnClick
        isCellEditable={(params) => {
          if (params.row.isDeleted) return false;
          if (params.row.isNew) return true;
          const isConfigured = isConfiguredSource(params.row.adSourceId);
          if (!isConfigured) return false;
          return true;
        }}
      />
    </Paper>
  );
}

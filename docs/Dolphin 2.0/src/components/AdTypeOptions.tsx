import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Paper,
  TextField,
  Typography,
  Alert,
  MenuItem,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { SyntheticEvent, Dispatch, SetStateAction } from "react";

interface Proptypes {
  /** Current ad format selected upstream */
  format: string;
  /** Setter passed from parent used to keep its networkOptions in sync */
  setNetworkOptions: (options: NetworkOptions) => void;
  setNetworkOptionsError(error: boolean): void;
}

// ────────────────────────────────────────────────────────────────────────────────
// Shared enums / helper types
const ALL_OPTIONS = ["RICH_MEDIA", "TEXT", "VIDEO", "IMAGE"] as const;
export type AdType = (typeof ALL_OPTIONS)[number];

export type CategoryOption = { label: string; value: number };
export type AdCategory = CategoryOption["value"];

const ORIENTATION_OPTIONS = ["VERTICAL", "HORIZONTAL"] as const;
export type Orientation = (typeof ORIENTATION_OPTIONS)[number];

const SIZE_OPTIONS = {
  BANNER: [
    { label: "600×500 (300×250)", width: 600, height: 500 },
    { label: "640×100 (320×50)", width: 640, height: 100 },
  ],
} as const;
export type SizeOption =
  (typeof SIZE_OPTIONS)[keyof typeof SIZE_OPTIONS][number];

/**
 * Shape stored in the parent component to be sent to the Pangle (or other) SDK.
 */
export interface NetworkOptions {
  adTypes: AdType[];
  orientation?: Orientation; // undefined if not relevant
  size?: SizeOption | null; // null/undefined when not relevant
  categories?: AdCategory[]; // empty array / undefined when not relevant
}

// ────────────────────────────────────────────────────────────────────────────────
// Constants per-format
const FORMAT_RULES: Record<
  string,
  {
    allowed: AdType[];
    required: AdType[];
  }
> = {
  BANNER: {
    allowed: ["RICH_MEDIA", "VIDEO"],
    required: [],
  },
  INTERSTITIAL: {
    allowed: ["RICH_MEDIA", "VIDEO"],
    required: [],
  },
  REWARDED: {
    allowed: ["VIDEO"],
    required: ["VIDEO"],
  },
  REWARDED_INTERSTITIAL: {
    allowed: ["VIDEO"],
    required: ["VIDEO"],
  },
  NATIVE: {
    allowed: ["RICH_MEDIA", "VIDEO"],
    required: [],
  },
  APP_OPEN: {
    allowed: ["RICH_MEDIA", "VIDEO"],
    required: ["RICH_MEDIA"],
  },
};

const ORIENTATION_FORMATS = ["INTERSTITIAL", "REWARDED", "APP_OPEN"] as const;
const SIZE_FORMATS = ["BANNER"] as const;

const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { label: "Video", value: 4 },
  { label: "Wide Image", value: 11 },
  { label: "Square Image", value: 12 },
  { label: "Square Video", value: 13 },
] as const;

enum Format {
  BANNER = "BANNER",
  INTERSTITIAL = "INTERSTITIAL",
  REWARDED = "REWARDED",
  REWARDED_INTERSTITIAL = "REWARDED_INTERSTITIAL",
  NATIVE = "NATIVE",
  APP_OPEN = "APP_OPEN",
}

// ────────────────────────────────────────────────────────────────────────────────
export default function AdTypeOptions({
  format,
  setNetworkOptions,
  setNetworkOptionsError,
}: Proptypes) {
  // Local component state mirrors the NetworkOptions structure
  const [adTypes, setAdTypes] = useState<AdType[]>([]);
  const [orientation, setOrientation] = useState<Orientation>("VERTICAL");
  const [size, setSize] = useState<SizeOption | null>(null);
  const [categories, setCategories] = useState<AdCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNetworkOptionsError(!!error);
  }, [error]);

  const { allowed, required } = FORMAT_RULES[format] || {
    allowed: [],
    required: [],
  };

  const selectableAdTypes = useMemo(() => {
    const options = [...new Set([...allowed, ...required])];
    return options.sort();
  }, [allowed, required]);

  // Whenever format changes, reset defaults and propagate
  useEffect(() => {
    const initialTypes = [...new Set([...allowed, ...required])];
    setAdTypes(initialTypes);

    // orientation default
    const initialOrientation: Orientation | undefined =
      ORIENTATION_FORMATS.includes(format as any) ? "VERTICAL" : undefined;
    setOrientation(initialOrientation ?? "VERTICAL");

    // size default for banner
    const initialSize: SizeOption | null = SIZE_FORMATS.includes(format as any)
      ? SIZE_OPTIONS.BANNER[0]
      : null;
    setSize(initialSize);

    // categories default for native
    const initialCats: AdCategory[] =
      format === Format.NATIVE ? [4, 11, 12, 13] : [];
    setCategories(initialCats);

    validate(initialTypes, initialCats);
    syncToParent(initialTypes, initialOrientation, initialSize, initialCats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  // —————————————————— Event Handlers ——————————————————
  const handleAdTypeChange = (
    _: SyntheticEvent<Element, Event>,
    newValue: AdType[]
  ) => {
    const withRequired = Array.from(new Set([...newValue, ...required]));
    setAdTypes(withRequired);
    syncToParent(withRequired, orientation, size, categories);
    validate(withRequired, categories);
  };

  const handleOrientationChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value as Orientation;
    setOrientation(value);
    syncToParent(adTypes, value, size, categories);
  };

  const handleSizeChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const selected =
      SIZE_OPTIONS.BANNER.find((s) => s.label === event.target.value) || null;
    setSize(selected);
    syncToParent(adTypes, orientation, selected, categories);
  };

  const handleCategoryChange = (
    _: SyntheticEvent<Element, Event>,
    newValue: CategoryOption[]
  ) => {
    const newCats = newValue.map((v) => v.value);
    setCategories(newCats);
    syncToParent(adTypes, orientation, size, newCats);
    validate(adTypes, newCats);
  };

  // —————————————————— Helpers ——————————————————
  const validate = (types: AdType[], cats: AdCategory[]) => {
    if (types.length === 0) {
      setError("At least one Ad Type must be selected.");
      return;
    }
    if (required.some((r) => !types.includes(r))) {
      setError(`Required: ${required.join(", ")}`);
      return;
    }
    if (format === Format.NATIVE && cats.length === 0) {
      setError("At least one category must be selected for Native.");
      return;
    }
    setError(null);
  };

  const syncToParent = (
    types: AdType[],
    orientationVal: Orientation | undefined,
    sizeVal: SizeOption | null,
    cats: AdCategory[]
  ) => {
    setNetworkOptions({
      adTypes: types,
      orientation: ORIENTATION_FORMATS.includes(format as any)
        ? orientationVal
        : undefined,
      size: format === Format.BANNER ? sizeVal : undefined,
      categories: format === Format.NATIVE ? cats : undefined,
    });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <Paper sx={{ width: "100%" }}>
      <Box sx={{ mx: 4, my: 2 }}>
        <Typography>AdMob Network Waterfall</Typography>

        {/* Ad Type */}
        <Autocomplete
          sx={{ mt: 2 }}
          multiple
          disableCloseOnSelect
          options={selectableAdTypes}
          value={adTypes}
          onChange={handleAdTypeChange}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <Checkbox
                style={{ marginRight: 8 }}
                checked={selected}
                disabled={required.includes(option)}
              />
              {option}
            </li>
          )}
          renderTags={(tagValue, getTagProps) =>
            tagValue.map((option, index) => (
              <Chip
                label={option}
                {...getTagProps({ index })}
                disabled={required.includes(option)}
              />
            ))
          }
          renderInput={(params) => <TextField {...params} label="Ad Type" />}
        />
      </Box>

      <Box sx={{ mx: 4, my: 2 }}>
        <Typography>Pangle</Typography>

        {/* Orientation */}
        {ORIENTATION_FORMATS.includes(format as any) && (
          <TextField
            sx={{ mt: 2 }}
            select
            label="Orientation"
            value={orientation}
            onChange={handleOrientationChange}
            fullWidth
          >
            {ORIENTATION_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Size (Banner) */}
        {format === Format.BANNER && (
          <TextField
            sx={{ mt: 2 }}
            select
            label="Ad Size"
            value={size?.label || ""}
            onChange={handleSizeChange}
            fullWidth
          >
            {SIZE_OPTIONS.BANNER.map((opt) => (
              <MenuItem key={opt.label} value={opt.label}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        )}

        {/* Categories (Native) */}
        {format === Format.NATIVE && (
          <Autocomplete
            sx={{ mt: 2 }}
            multiple
            disableCloseOnSelect
            options={CATEGORY_OPTIONS}
            getOptionLabel={(opt) => opt.label}
            value={CATEGORY_OPTIONS.filter((opt) =>
              categories.includes(opt.value)
            )}
            onChange={handleCategoryChange}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox style={{ marginRight: 8 }} checked={selected} />
                {option.label}
              </li>
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip label={option.label} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Ad Categories" />
            )}
          />
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}

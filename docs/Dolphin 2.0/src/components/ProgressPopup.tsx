import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import Fade from "@mui/material/Fade";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  linearProgressClasses,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import JsonViewer from "@uiw/react-json-view"; // ⬅️ new

/* ----- styles ---------------------------------------------------- */
const BorderLinearProgress = styled(LinearProgress)`
  height: 10px !important;
  border-radius: 5px;

  .${linearProgressClasses.bar} {
    border-radius: 5px;
    background-color: #1a90ff;
  }
`;

const logBoxStyle = {
  mt: 3,
  mb: 2,
  maxHeight: 260,
  overflowY: "auto",
  bgcolor: "#f9f9f9",
  border: "1px solid #ddd",
  borderRadius: 1,
  p: 2,
  fontFamily: "monospace",
  fontSize: 13,
  lineHeight: 1.35,
};

const modalStyle = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "50%",
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: 24,
  p: 8,
  outline: "none",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

/* ----- types ----------------------------------------------------- */
export interface LogLine {
  id: number;
  msg: string;
  data?: unknown;
}

interface Props {
  isOpen: boolean;
  status: string;
  percent: number;
  showClose: boolean;
  logs: LogLine[];
}

/* ----- component ------------------------------------------------- */
export default function ProgressPopup({
  isOpen,
  status,
  percent,
  showClose,
  logs,
}: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(isOpen), [isOpen]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Modal
      aria-labelledby="progress-modal-title"
      open={open}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{ backdrop: { timeout: 500 } }}
    >
      <Fade in={open}>
        <Box sx={modalStyle}>
          <Typography
            id="progress-modal-title"
            variant="h5"
            sx={{ textAlign: "center", mb: 2, fontWeight: 500 }}
          >
            Applying Changes
          </Typography>

          {/* ─────────────── LOG PANEL ─────────────── */}
          <Box sx={logBoxStyle}>
            {logs.map((ln) =>
              ln.data === undefined ? (
                <Typography key={ln.id} component="pre" sx={{ m: 0 }}>
                  {ln.msg}
                </Typography>
              ) : (
                <Accordion key={ln.id} elevation={0} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography component="span">{ln.msg}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <JsonViewer
                      value={ln.data ?? {}}
                      collapsed={1} // root open, children collapsed
                      enableClipboard={false}
                      displayDataTypes={false}
                      style={{ fontSize: 12 }}
                    />
                  </AccordionDetails>
                </Accordion>
              )
            )}
            <div ref={bottomRef} />
          </Box>

          <Typography sx={{ mt: 2, mb: 4, textAlign: "center" }}>
            {status}
          </Typography>

          <BorderLinearProgress variant="determinate" value={percent} />

          {showClose && (
            <Box sx={{ alignSelf: "center" }}>
              <Button
                sx={{ mt: 4 }}
                variant="contained"
                size="large"
                onClick={() => window.location.reload()}
              >
                Close & Reload
              </Button>
            </Box>
          )}
        </Box>
      </Fade>
    </Modal>
  );
}

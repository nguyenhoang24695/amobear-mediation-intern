import { Typography, AppBar, Toolbar } from "@mui/material";

interface PropTypes {
  title: string;
  select?: any;
}

const Header = ({ title, select }: PropTypes) => {
  return (
    <AppBar position="static" style={{ boxShadow: "none" }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {select}
      </Toolbar>
    </AppBar>
  );
};

export default Header;

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#FBBF24', // Yellow - "Tametzonia" accent
            contrastText: '#000000',
        },
        secondary: {
            main: '#f48fb1', // Pink-ish (default secondary or custom)
        },
        background: {
            default: '#111315',
            paper: '#1F2329',
        },
        text: {
            primary: '#ffffff',
            secondary: '#9ca3af',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            fontWeight: 700,
            textTransform: 'none', // Modern buttons usually don't shout
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12, // More grounded, matches our rounded-xl
                    paddingTop: 10,
                    paddingBottom: 10,
                },
            },
        },
    },
});

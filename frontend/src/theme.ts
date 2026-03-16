import { createTheme } from '@mui/material/styles'

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#FBBF24', // Amber/Yellow
        },
        background: {
            default: '#121212',
            paper: '#1F2329',
        },
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
    },
})

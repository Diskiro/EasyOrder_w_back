import { createContext, useContext, useState, type ReactNode } from 'react';
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface UIContextType {
    showAlert: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
    showConfirm: (title: string, message: string) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }: { children: ReactNode }) => {
    // Alert State
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

    // Confirm State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmResolve, setConfirmResolve] = useState<((value: boolean) => void) | null>(null);

    const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
        setAlertMessage(message);
        setAlertType(type);
        setAlertOpen(true);
    };

    const showConfirm = (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmTitle(title);
            setConfirmMessage(message);
            setConfirmOpen(true);
            setConfirmResolve(() => resolve);
        });
    };

    const handleConfirmClose = (result: boolean) => {
        setConfirmOpen(false);
        if (confirmResolve) {
            confirmResolve(result);
            setConfirmResolve(null);
        }
    };

    return (
        <UIContext.Provider value={{ showAlert, showConfirm }}>
            {children}

            {/* Global Alert (Snackbar) */}
            <Snackbar
                open={alertOpen}
                autoHideDuration={6000}
                onClose={() => setAlertOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setAlertOpen(false)} severity={alertType} sx={{ width: '100%' }}>
                    {alertMessage}
                </Alert>
            </Snackbar>

            {/* Global Confirm Dialog */}
            <Dialog
                open={confirmOpen}
                onClose={() => handleConfirmClose(false)}
                PaperProps={{
                    style: {
                        backgroundColor: '#1F2329',
                        color: 'white',
                        border: '1px solid #333'
                    }
                }}
            >
                <DialogTitle sx={{ color: '#FBBF24' }}>{confirmTitle}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#D1D5DB' }}>
                        {confirmMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmClose(false)} sx={{ color: 'gray' }}>
                        Cancelar
                    </Button>
                    <Button onClick={() => handleConfirmClose(true)} variant="contained" color="primary" autoFocus>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </UIContext.Provider>
    );
};

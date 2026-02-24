import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCashRegister, useCashRegisterMutations } from '../hooks/useCashRegister';
import { DollarSign, Lock, Unlock, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { CircularProgress, Button, TextField, Snackbar, Alert } from '@mui/material';

export default function CashRegisterView() {
    const { user } = useAuth();
    const { data: session, isLoading, refetch } = useCashRegister();
    const { openSession, closeSession } = useCashRegisterMutations();

    const [startAmount, setStartAmount] = useState('');
    const [endAmount, setEndAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Determine current state: 'loading', 'closed', 'open'
    const isSessionOpen = session && !session.closed_at;

    const handleOpenSession = async () => {
        if (!user) return;
        try {
            await openSession.mutateAsync({
                startAmount: parseFloat(startAmount) || 0,
                userId: user.id
            });
            setMessage({ type: 'success', text: 'Caja abierta correctamente.' });
            setStartAmount(''); // Clear input
            refetch();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al abrir caja.' });
        }
    };

    const handleCloseSession = async () => {
        if (!user || !session) return;
        try {
            await closeSession.mutateAsync({
                id: session.id,
                endAmount: parseFloat(endAmount) || 0,
                notes,
                userId: user.id
            });
            setMessage({ type: 'success', text: 'Caja cerrada correctamente.' });
            setShowCloseConfirm(false);
            setEndAmount('');
            setNotes('');
            refetch();
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al cerrar caja.' });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-full"><CircularProgress color="inherit" /></div>;

    return (
        <div className="p-8 h-full overflow-y-auto animated-fadeIn">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <DollarSign className="text-emerald-400" size={32} />
                Control de Caja
            </h1>
            <p className="text-gray-400 mb-8">Gestiona la apertura y cierre de turnos de caja.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* STATUS CARD */}
                <div className="bg-[#1F2329] p-8 rounded-3xl border border-gray-700/50 shadow-xl relative overflow-hidden">
                    <div className={`absolute top-0 right-0 p-4 text-xs font-bold uppercase tracking-widest ${isSessionOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} rounded-bl-2xl`}>
                        {isSessionOpen ? 'Turno Abierto' : 'Caja Cerrada'}
                    </div>

                    <div className="flex flex-col items-center justify-center py-8">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isSessionOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {isSessionOpen ? <Unlock size={48} /> : <Lock size={48} />}
                        </div>

                        {isSessionOpen ? (
                            <div className="text-center w-full">
                                <h3 className="text-2xl font-bold text-white mb-2">Sesión Activa</h3>
                                <p className="text-gray-400 mb-6">Abierta por: <span className="text-white font-medium">Usuario Actual</span></p>
                                <div className="grid grid-cols-2 gap-4 w-full bg-[#13161a] p-4 rounded-xl mb-6">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase">Fondo Inicial</p>
                                        <p className="text-xl font-bold text-white">${session.start_amount.toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 uppercase">Inicio</p>
                                        <p className="text-sm font-bold text-white">{new Date(session.opened_at).toLocaleTimeString()}</p>
                                    </div>
                                    {/* Added Current Time Display */}
                                    <div className="col-span-2 text-center border-t border-gray-800 pt-2 mt-2">
                                        <p className="text-xs text-gray-500 uppercase">Hora Actual</p>
                                        <p className="text-lg font-mono text-emerald-400">
                                            {new Date().toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    size="large"
                                    onClick={() => setShowCloseConfirm(true)}
                                    startIcon={<Lock />}
                                >
                                    Cerrar Caja
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center w-full">
                                <h3 className="text-2xl font-bold text-white mb-4">Iniciar Nuevo Turno</h3>
                                <p className="text-gray-400 mb-6 text-sm">Ingresa el monto inicial en efectivo para abrir la caja.</p>

                                <TextField
                                    label="Fondo de Caja ($)"
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    value={startAmount}
                                    onChange={(e) => setStartAmount(e.target.value)}
                                    sx={{
                                        mb: 3,
                                        '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: '#4B5563' } },
                                        '& .MuiInputLabel-root': { color: '#9CA3AF' }
                                    }}
                                />

                                <Button
                                    variant="contained"
                                    color="success"
                                    fullWidth
                                    size="large"
                                    onClick={handleOpenSession}
                                    startIcon={<Unlock />}
                                    disabled={!startAmount}
                                >
                                    Abrir Caja
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* HISTORY / CLOSING FORM */}
                {isSessionOpen && showCloseConfirm && (
                    <div className="bg-[#1F2329] p-8 rounded-3xl border border-rose-500/30 shadow-xl animated-slideIn">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <AlertTriangle className="text-rose-400" />
                            Finalizar Turno
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-rose-500/10 p-4 rounded-lg border border-rose-500/20 mb-4">
                                <p className="text-rose-200 text-sm">
                                    Al cerrar la caja, por favor cuenta todo el efectivo físico.
                                    El sistema calculará automáticamente las diferencias.
                                </p>
                            </div>

                            <TextField
                                label="Efectivo Final en Caja ($)"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={endAmount}
                                onChange={(e) => setEndAmount(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: '#4B5563' } },
                                    '& .MuiInputLabel-root': { color: '#9CA3AF' }
                                }}
                            />

                            <TextField
                                label="Notas / Observaciones"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: '#4B5563' } },
                                    '& .MuiInputLabel-root': { color: '#9CA3AF' }
                                }}
                            />

                            <div className="flex gap-3 mt-4">
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    fullWidth
                                    onClick={() => setShowCloseConfirm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    onClick={handleCloseSession}
                                    startIcon={<Save />}
                                >
                                    Confirmar Cierre
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {!isSessionOpen && session && session.closed_at && (
                    <div className="bg-[#1F2329] p-8 rounded-3xl border border-gray-700/50 shadow-xl">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <RefreshCw className="text-blue-400" />
                            Resumen Última Sesión
                        </h3>
                        <div className="space-y-3 text-gray-300">
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span>Inicio:</span>
                                <span className="font-mono text-white">${session.start_amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-700 pb-2">
                                <span>Final:</span>
                                <span className="font-mono text-emerald-400">${session.end_amount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Cerrado por:</span>
                                <span className="text-white text-sm">Usuario</span>
                            </div>
                            <div className="mt-4 p-3 bg-gray-800 rounded text-sm italic text-gray-400">
                                "{session.notes || 'Sin notas'}"
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Snackbar open={!!message} autoHideDuration={6000} onClose={() => setMessage(null)}>
                <Alert onClose={() => setMessage(null)} severity={message?.type || 'info'} sx={{ width: '100%' }}>
                    {message?.text}
                </Alert>
            </Snackbar>
        </div>
    );
}

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useReservations, useReservationMutations, type Reservation } from '../hooks/useReservations'
import { Search, Plus, CheckCircle, User, Clock, CalendarDays, ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { Button, Stack, Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { TimeClock } from '@mui/x-date-pickers/TimeClock'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import dayjs, { Dayjs } from 'dayjs'
import { useUI } from '../context/UIContext'

export default function ReservationsView() {
    const navigate = useNavigate()
    const { showAlert, showConfirm } = useUI()
    const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('week'))
    const [shift, setShift] = useState<'lunch' | 'dinner'>('lunch')
    const [searchQuery, setSearchQuery] = useState('')
    const [showNewResModal, setShowNewResModal] = useState(false)
    const [newResData, setNewResData] = useState<{ name: string, pax: number, time: Dayjs | null, notes: string }>({ name: '', pax: 2, time: dayjs(), notes: '' })
    const [dateTimeView, setDateTimeView] = useState<'date' | 'time'>('date')

    const startDate = currentWeekStart.toISOString()
    const endDate = currentWeekStart.endOf('week').toISOString()

    const { data: reservations, isLoading } = useReservations(shift, startDate, endDate)
    const { createReservation, updateReservation } = useReservationMutations()

    // Filter reservations
    const filteredReservations = useMemo(() => {
        if (!reservations) return []
        let result = reservations
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(r => r.customer_name.toLowerCase().includes(query))
        }
        return result
    }, [reservations, searchQuery])

    // Group by Day
    const reservationsByDay = useMemo(() => {
        const groups: Record<string, Reservation[]> = {}
        filteredReservations.forEach(res => {
            const dayKey = dayjs(res.reservation_time).format('YYYY-MM-DD')
            if (!groups[dayKey]) groups[dayKey] = []
            groups[dayKey].push(res)
        })
        return groups
    }, [filteredReservations])

    const handleCreateReservation = async () => {
        try {
            if (!newResData.name || !newResData.time) {
                showAlert('Por favor completa el Nombre y la Hora', 'warning')
                return
            }

            // Combine selected Date + Time
            const selectedDate = newResData.time

            await createReservation.mutateAsync({
                customer_name: newResData.name,
                pax: newResData.pax,
                reservation_time: selectedDate.toISOString(),
                shift: shift,
                table_id: null,
                status: 'confirmed',
                notes: newResData.notes
            })
            setShowNewResModal(false)
            setNewResData({ name: '', pax: 2, time: dayjs(), notes: '' })
            showAlert('Reserva creada exitosamente', 'success')
        } catch (error) {
            console.error(error)
            showAlert('Error al crear la reserva', 'error')
        }
    }

    const handleReservationStatus = async (id: number, status: 'arrived' | 'cancelled') => {
        try {
            await updateReservation.mutateAsync({ id, updates: { status } })
            showAlert(`Reserva marcada como ${status === 'arrived' ? 'llegada' : 'cancelada'}`, 'success')
        } catch (error) {
            console.error(error)
            showAlert('Error al actualizar estado', 'error')
        }
    }

    const handleAssignTable = (res: Reservation) => {
        // Navigate to TablesView with the reservation to assign
        navigate('/tables', { state: { assignReservation: res } })
    }

    const nextWeek = () => setCurrentWeekStart(prev => prev.add(1, 'week'))
    const prevWeek = () => setCurrentWeekStart(prev => prev.subtract(1, 'week'))

    if (isLoading) return <div className="p-8 text-white">Cargando reservas...</div>

    return (
        <div className="flex flex-col h-full bg-[#111315] font-sans text-gray-200">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-800 flex flex-wrap gap-4 items-center justify-between bg-[#141619]">
                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-between md:justify-start">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CalendarDays className="text-[#FBBF24]" />
                        Reservas
                    </h1>

                    {/* Week Navigation */}
                    <div className="flex items-center bg-[#1F2329] rounded-lg p-1 border border-gray-700 w-full md:w-auto justify-between md:justify-center mx-0 md:mx-4 flex-nowrap overflow-hidden">
                        <Button onClick={prevWeek} sx={{ color: 'white', minWidth: { xs: 30, md: 40 }, padding: 0 }}><ArrowRight size={18} className="rotate-180" /></Button>
                        <span className="px-2 md:px-4 font-bold text-xs md:text-sm text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1 text-center">
                            <span className="hidden md:inline">Semana </span>
                            {currentWeekStart.format('DD MMM')} - {currentWeekStart.add(6, 'day').format('DD MMM')}
                        </span>
                        <Button onClick={nextWeek} sx={{ color: 'white', minWidth: { xs: 30, md: 40 }, padding: 0 }}><ArrowRight size={18} /></Button>
                    </div>

                    <div className="h-8 w-px bg-gray-700 hidden md:block" />

                    <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                        <Button
                            variant={shift === 'lunch' ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setShift('lunch')}
                            sx={{ color: shift === 'lunch' ? 'black' : 'gray', borderColor: '#333' }}
                        >
                            COMIDA
                        </Button>
                        <Button
                            variant={shift === 'dinner' ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => setShift('dinner')}
                            sx={{ color: shift === 'dinner' ? 'black' : 'gray', borderColor: '#333' }}
                        >
                            CENA
                        </Button>
                    </Stack>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto mt-2 md:mt-0">
                    {/* Mobile Shift Toggle */}
                    <Stack direction="row" spacing={1} sx={{ display: { xs: 'flex', md: 'none' }, flex: 1 }}>
                        <Button fullWidth variant={shift === 'lunch' ? "contained" : "outlined"} onClick={() => setShift('lunch')}>Comida</Button>
                        <Button fullWidth variant={shift === 'dinner' ? "contained" : "outlined"} onClick={() => setShift('dinner')}>Cena</Button>
                    </Stack>

                    <div className="relative w-full md:w-auto md:flex-1 md:min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1F2329] border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#FBBF24] transition-colors text-white"
                        />
                    </div>

                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Plus size={18} />}
                        onClick={() => setShowNewResModal(true)}
                        sx={{ color: 'black', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                    >
                        NUEVA
                    </Button>
                </div>
            </div>

            {/* List - Grouped by Day */}
            <div className="flex-1 overflow-y-auto p-6">
                {Object.keys(reservationsByDay).sort().map(dateKey => (
                    <div key={dateKey} className="mb-8">
                        <h3 className="text-xl font-bold text-[#FBBF24] mb-4 border-b border-gray-800 pb-2 capitalize top-0 bg-[#111315] z-10">
                            {dayjs(dateKey).format('dddd DD MMMM')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {reservationsByDay[dateKey].map(res => (
                                <div key={res.id} className={clsx(
                                    "group bg-[#1F2329] p-4 rounded-xl border border-gray-800 hover:border-gray-600 transition-all shadow-lg flex flex-col relative overflow-hidden",
                                    res.status === 'completed' && "opacity-50 grayscale"
                                )}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-lg",
                                                res.status === 'arrived' ? "bg-green-500" : res.status === 'completed' ? "bg-gray-600" : "bg-blue-600"
                                            )}>
                                                {res.status === 'arrived' ? <CheckCircle size={20} /> : <Clock size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-white leading-tight">{res.customer_name}</h3>
                                                <div className="flex items-center text-xs text-gray-400 mt-1">
                                                    <Clock size={12} className="mr-1" />
                                                    {dayjs(res.reservation_time).format('h:mm A')}
                                                </div>
                                            </div>
                                        </div>
                                        <Chip
                                            label={res.status}
                                            size="small"
                                            className={clsx(
                                                "uppercase font-bold tracking-wide",
                                                res.status === 'arrived' ? "bg-green-500/20 text-green-400" :
                                                    res.status === 'completed' ? "bg-gray-500/20 text-gray-400" :
                                                        "bg-blue-500/20 text-blue-400"
                                            )}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-300 bg-[#141619] p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-gray-500" />
                                            <span className="font-bold">{res.pax} Pax</span>
                                        </div>
                                        {res.table_id && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span>Mesa {res.table_id}</span>
                                            </div>
                                        )}
                                    </div>

                                    {res.notes && (
                                        <div className="mb-4 text-xs text-gray-500 italic px-2">
                                            "{res.notes}"
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4 border-t border-gray-700/50 flex gap-2">
                                        {res.status === 'confirmed' && (
                                            <>
                                                <Button
                                                    fullWidth
                                                    variant="outlined"
                                                    color="success"
                                                    size="small"
                                                    onClick={() => handleReservationStatus(res.id, 'arrived')}
                                                    startIcon={<CheckCircle size={16} />}
                                                >
                                                    Llegó
                                                </Button>
                                            </>
                                        )}
                                        {res.status === 'arrived' && (
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                color="primary"
                                                size="small"
                                                onClick={() => handleAssignTable(res)}
                                                endIcon={<ArrowRight size={16} />}
                                                sx={{ color: 'black', fontWeight: 'bold' }}
                                            >
                                                Asignar Mesa
                                            </Button>
                                        )}
                                        {(res.status === 'confirmed' || res.status === 'arrived') && (
                                            <Button
                                                variant="text"
                                                color="error"
                                                size="small"
                                                onClick={async () => { if (await showConfirm('Confirmar Cancelación', '¿Seguro que deseas cancelar esta reserva?')) handleReservationStatus(res.id, 'cancelled') }}
                                                sx={{ minWidth: 40 }}
                                            >
                                                X
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredReservations.length === 0 && (
                    <div className="text-center text-gray-500 mt-20">
                        <CalendarDays size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No hay reservas para esta semana.</p>
                    </div>
                )}
            </div>

            {/* Modal - Rendered in Portal to be on top of Sidebar */}
            {showNewResModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-[#1F2329] border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 pb-2 shrink-0 border-b border-gray-800">
                            <h2 className="text-xl font-bold text-white">Nueva Reserva</h2>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Nombre Cliente</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#141619] text-white p-2 rounded border border-gray-700 focus:border-[#FBBF24]"
                                        value={newResData.name}
                                        onChange={e => setNewResData({ ...newResData, name: e.target.value })}
                                        placeholder="Nombre del cliente"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-gray-400 text-sm mb-1">Personas</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#141619] text-white p-2 rounded border border-gray-700 focus:border-[#FBBF24]"
                                            value={newResData.pax}
                                            onChange={e => setNewResData({ ...newResData, pax: Number(e.target.value) })}
                                            min={1}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 justify-center bg-[#141619] rounded-xl p-4 border border-gray-800">
                                    {!newResData.name ? (
                                        <div className="text-center p-8 text-gray-500">
                                            <p className="mb-2">🔒</p>
                                            <p className="text-sm">Ingresa el nombre del cliente para seleccionar fecha y hora</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex bg-[#1F2329] p-1 rounded-lg mb-2">
                                                <button
                                                    className={clsx("flex-1 py-1 text-sm font-bold rounded-md transition-colors", dateTimeView === 'date' ? "bg-[#FBBF24] text-black" : "text-gray-400 hover:text-white")}
                                                    onClick={() => setDateTimeView('date')}
                                                >
                                                    Fecha
                                                </button>
                                                <button
                                                    className={clsx("flex-1 py-1 text-sm font-bold rounded-md transition-colors", dateTimeView === 'time' ? "bg-[#FBBF24] text-black" : "text-gray-400 hover:text-white")}
                                                    onClick={() => setDateTimeView('time')}
                                                >
                                                    Hora
                                                </button>
                                            </div>

                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                <div className="flex justify-center min-h-[300px]">
                                                    {dateTimeView === 'date' ? (
                                                        <DateCalendar
                                                            value={newResData.time}
                                                            onChange={(newValue) => {
                                                                setNewResData({ ...newResData, time: newValue })
                                                                setDateTimeView('time')
                                                            }}
                                                            className="text-white"
                                                            sx={{
                                                                '& .MuiPickersDay-root': { color: 'white' },
                                                                '& .Mui-selected': { backgroundColor: '#FBBF24 !important', color: 'black !important' },
                                                                '& .MuiPickersDay-today': { borderColor: '#FBBF24' }
                                                            }}
                                                        />
                                                    ) : (
                                                        <TimeClock
                                                            value={newResData.time}
                                                            onChange={(newValue) => setNewResData({ ...newResData, time: newValue })}
                                                            ampm={false}
                                                            views={['hours', 'minutes']}
                                                            className="text-white"
                                                            sx={{
                                                                '& .MuiClock-pin': { backgroundColor: '#FBBF24' },
                                                                '& .MuiClockPointer-root': { backgroundColor: '#FBBF24' },
                                                                '& .MuiClockPointer-thumb': { borderColor: '#FBBF24', backgroundColor: '#FBBF24' },
                                                                '& .MuiClockNumber-root': { color: 'gray' },
                                                                '& .Mui-selected': { backgroundColor: '#FBBF24 !important', color: 'black !important' }
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </LocalizationProvider>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Notas</label>
                                <textarea
                                    className="w-full bg-[#141619] text-white p-2 rounded border border-gray-700 focus:border-[#FBBF24]"
                                    value={newResData.notes}
                                    onChange={e => setNewResData({ ...newResData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-6 pt-4 border-t border-gray-800 shrink-0 flex justify-end gap-2 bg-[#1F2329] rounded-b-2xl">
                            <Button onClick={() => setShowNewResModal(false)} variant="outlined" color="inherit">
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateReservation} variant="contained" color="primary">
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

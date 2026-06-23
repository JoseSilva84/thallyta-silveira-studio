import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuickBookingToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const closed = sessionStorage.getItem('quickBookingToastClosed');
    if (closed) {
      setIsClosed(true);
      return;
    }

    // Delay before showing the toast (5 seconds)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (isClosed) return null;

  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => {
      setIsClosed(true);
      sessionStorage.setItem('quickBookingToastClosed', 'true');
    }, 500); // Wait for transition to finish
  };

  const handleNavigate = () => {
    navigate('/agendar');
    setIsVisible(false);
    setTimeout(() => {
      setIsClosed(true);
      sessionStorage.setItem('quickBookingToastClosed', 'true');
    }, 500);
  };

  return (
    <div
      onClick={handleNavigate}
      className={`fixed bottom-[220px] right-5 md:bottom-[160px] z-50 flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-[#D9B15C] to-[#F7E6A8] p-3 text-[#15120F] shadow-[0_10px_40px_rgba(217,177,92,0.3)] transition-all duration-700 ease-out transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0 pointer-events-none'
      } w-64 border border-[#F7E6A8]/50`}
    >
      <div className="flex-shrink-0 grid place-items-center rounded-full bg-[#15120F]/10 p-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-tight uppercase tracking-wide">Agendamento Rápido</span>
        <span className="text-xs font-medium opacity-90 mt-0.5">Garanta seu horário aqui!</span>
      </div>
      <button
        onClick={handleClose}
        className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-[#15120F] text-[#D9B15C] shadow-lg hover:scale-110 transition-transform"
        title="Fechar notificação"
        aria-label="Fechar notificação"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Ripple effect line at the bottom */}
      <div className="absolute bottom-0 left-0 h-1 bg-[#15120F]/20 rounded-b-2xl w-full overflow-hidden">
        <div className="h-full bg-[#15120F]/40 animate-pulse w-full"></div>
      </div>
    </div>
  );
}

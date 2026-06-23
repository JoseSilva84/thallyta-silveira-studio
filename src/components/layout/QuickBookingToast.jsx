import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiCalendar, FiX, FiChevronRight } from 'react-icons/fi';

export default function QuickBookingToast() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Reset states and trigger animation when returning to home page
  useEffect(() => {
    // Only show on home page or pages other than /agendar
    if (location.pathname === '/agendar') {
      setIsVisible(false);
      return;
    }

    // Reset dismissed state when navigating back to home
    setIsDismissed(false);

    // Show after a delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 4000);

    return () => {
      clearTimeout(timer);
      setIsVisible(false);
    };
  }, [location.pathname]);

  if (isDismissed || location.pathname === '/agendar') return null;

  const handleClose = (e) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      sessionStorage.setItem('quickBookingToastClosed', 'true');
    }, 500); // Wait for transition
  };

  const handleNavigate = () => {
    navigate('/agendar');
    // Hide immediately
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
    }, 500);
  };

  return (
    <div
      onClick={handleNavigate}
      className={`fixed bottom-[220px] right-4 md:bottom-[160px] md:right-8 z-50 flex w-[290px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#D9B15C]/40 bg-[#15120F]/85 p-4 shadow-[0_8px_32px_rgba(217,177,92,0.15)] backdrop-blur-md transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-[120%] opacity-0 scale-95 pointer-events-none'
      } group hover:border-[#D9B15C]/80 hover:bg-[#15120F]/95 hover:shadow-[0_12px_48px_rgba(217,177,92,0.25)]`}
    >
      {/* Decorative gradient blur */}
      <div className="absolute -left-10 -top-10 h-24 w-24 rounded-full bg-[#D9B15C]/20 blur-2xl transition-all duration-500 group-hover:bg-[#D9B15C]/30"></div>
      
      <div className="relative flex items-center gap-4">
        {/* Icon Container with Pulse */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D9B15C] to-[#9D8243] text-[#15120F] shadow-lg">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#D9B15C]/40"></div>
          <FiCalendar className="relative z-10 text-xl" />
        </div>

        {/* Text Content */}
        <div className="flex flex-col">
          <span className="text-sm font-bold uppercase tracking-wider text-[#F7E6A8]">
            Agendamento
          </span>
          <span className="text-sm font-medium text-cream/90 group-hover:text-cream">
            Reserve seu horário rápido
          </span>
        </div>

        {/* Action arrow */}
        <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[#D9B15C] transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-[#D9B15C]/20">
          <FiChevronRight className="text-lg" />
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-transparent text-cream/50 transition-colors hover:bg-white/10 hover:text-cream focus:outline-none"
        aria-label="Fechar notificação"
        title="Fechar"
      >
        <FiX className="text-sm" />
      </button>

      {/* Progress/Timer Bar effect (optional aesthetic) */}
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#D9B15C]/10">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-[#D9B15C]/50 to-transparent animate-pulse"></div>
      </div>
    </div>
  );
}

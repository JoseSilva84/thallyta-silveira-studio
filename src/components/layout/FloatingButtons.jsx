import { BsInstagram, BsWhatsapp } from 'react-icons/bs'

export default function FloatingButtons() {
  return (
    <div className="fixed bottom-20 right-5 z-40 flex flex-col gap-3 md:bottom-5">
      <a
        href="https://instagram.com/studiodebelezathallytasilveira"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        title="Instagram"
        className="float-social grid size-12 place-items-center rounded-full bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-xl text-white shadow-xl md:size-14"
      >
        <BsInstagram />
      </a>
      <a
        href="https://wa.me/5588981860582"
        target="_blank"
        rel="noreferrer"
        aria-label="Fale no WhatsApp"
        title="Fale no WhatsApp"
        className="float-social grid size-12 place-items-center rounded-full bg-[#25D366] text-xl text-white shadow-xl md:size-14"
        style={{ animation: 'pulse-soft 2.4s ease-in-out infinite' }}
      >
        <BsWhatsapp />
      </a>
    </div>
  )
}

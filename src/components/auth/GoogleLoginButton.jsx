import { FcGoogle } from 'react-icons/fc'

export default function GoogleLoginButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="tap-gold inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-zinc-900">
      <FcGoogle /> Google
    </button>
  )
}

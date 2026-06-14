import { useEffect, useState } from 'react'

export default function UserAvatar({ user, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [user?.avatarUrl])

  const initial = user?.name?.slice(0, 1).toUpperCase() || '?'

  if (user?.avatarUrl && !imageFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={`Foto de ${user.name}`}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }

  return (
    <span className={`grid place-items-center bg-gold font-bold text-dark ${className}`}>
      {initial}
    </span>
  )
}


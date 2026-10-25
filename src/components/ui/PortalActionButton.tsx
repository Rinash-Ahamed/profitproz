import type { ButtonHTMLAttributes } from 'react'

/** Portal actions keep a visible label, stable icon spacing, and a shared focus style. */
export function PortalActionButton({ className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} type={type} className={`portal-action ${className}`} />
}

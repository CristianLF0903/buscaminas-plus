import type { ButtonHTMLAttributes } from 'react'
import { buttonClass } from './buttonStyles'
import type { ButtonVariant } from './buttonStyles'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export default function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant)} ${className}`}
      {...rest}
    />
  )
}

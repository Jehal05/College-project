import { buttonClass } from '../../services/uiClasses.js';

/** Shared button. Variants: primary, secondary, danger, ghost. 44px target and a visible focus ring built in. */
export default function Button({ variant = 'primary', className = '', type = 'button', children, ...rest }) {
  return <button type={type} className={buttonClass(variant, className)} {...rest}>{children}</button>;
}

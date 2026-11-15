import { badgeClass } from '../../services/uiClasses.js';

/** Small pill label. Tones: neutral, info, success, warning, danger. Put the meaning in the text, not only in the tone. */
export default function Badge({ tone = 'neutral', className = '', children, ...rest }) {
  return <span className={badgeClass(tone, className)} {...rest}>{children}</span>;
}

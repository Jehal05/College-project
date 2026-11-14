// Card for themed screens: rounded, thin border, theme colours. `glow` is for the ONE focal element on a screen.
export default function Panel({ as: Tag = 'section', glow = false, className = '', children, ...rest }) {
  return (
    <Tag className={'rounded-2xl border border-ht-line bg-ht-card p-4 text-ht-text transition-shadow duration-ht ' + (glow ? 'shadow-glow ' : '') + className} {...rest}>
      {children}
    </Tag>
  );
}

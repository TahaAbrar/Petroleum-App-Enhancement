import logoSrc from '../assets/alicomz-logo.png'

type AliComzLogoProps = {
  className?: string
  animated?: boolean
  title?: string
}

/** AliComz brand mark for intro + login (same entrance motion as previous logo). */
export function AliComzLogo({
  className = '',
  animated = false,
  title = 'AliComz',
}: AliComzLogoProps) {
  return (
    <img
      src={logoSrc}
      alt={title}
      title={title}
      draggable={false}
      className={`ac-logo select-none ${animated ? 'ac-logo--animated' : ''} ${className}`.trim()}
    />
  )
}

export default AliComzLogo

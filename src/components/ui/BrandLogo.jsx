import clsx from 'clsx';
import logo from '../../assets/logo.png';
import wordmark from '../../assets/logo_archonell.webp';

const sizeMap = {
  icon: 'w-10 h-10 rounded-full',
  large: 'w-16 h-16 rounded-full',
  wordmark: 'h-12 sm:h-14 w-auto object-contain',
  full: 'h-10 sm:h-12 w-auto object-contain',
};

export default function BrandLogo({ variant = 'icon', className }) {
  const isWordmark = variant === 'wordmark' || variant === 'full';
  return (
    <img
      src={isWordmark ? wordmark : logo}
      alt="Archon Nell Incorporated"
      className={clsx('object-contain flex-shrink-0', sizeMap[variant] || sizeMap.icon, className)}
    />
  );
}

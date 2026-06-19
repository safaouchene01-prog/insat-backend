import React from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../../assets/logo-insat.png';

interface LogoProps {
  variant?: 'nav' | 'footer' | 'hero' | 'auth';
  className?: string;
  isScrolled?: boolean;
}

export default function Logo({ variant = 'nav', className = '', isScrolled = false }: LogoProps) {
  // Determine base classes based on variant
  let sizeClass = '';
  
  switch (variant) {
    case 'nav':
      sizeClass = isScrolled ? 'h-[var(--logo-height-nav-scrolled)]' : 'h-[var(--logo-height-nav-mobile)] md:h-[var(--logo-height-nav-desktop)]';
      break;
    case 'footer':
      sizeClass = 'h-[var(--logo-height-footer)] max-w-full';
      break;
    case 'hero':
      sizeClass = 'h-[var(--logo-height-hero)]';
      break;
    case 'auth':
      sizeClass = 'h-[var(--logo-height-nav-desktop)]';
      break;
    default:
      sizeClass = 'h-[var(--logo-height-nav-desktop)]';
  }

  const imgClasses = `w-auto object-contain transition-all duration-200 ease-in-out ${sizeClass} ${className}`;

  const altText = "TRK GFX1 — Brand Identity Designer";

  // If used in footer, might need brightness-0 invert (though it's usually passed via className)
  return (
    <img 
      src={logoUrl} 
      alt={altText} 
      className={imgClasses} 
    />
  );
}

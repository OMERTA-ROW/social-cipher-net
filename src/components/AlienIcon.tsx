interface AlienIconProps {
  className?: string;
}

export const AlienIcon = ({ className = "" }: AlienIconProps) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Alien head outline */}
      <path d="M12 2C8 2 5 5 4 8c-1 3 0 6 2 8l1 2h10l1-2c2-2 3-5 2-8-1-3-4-6-8-6z" />
      
      {/* Left eye */}
      <ellipse cx="9" cy="10" rx="2" ry="3" fill="currentColor" />
      
      {/* Right eye */}
      <ellipse cx="15" cy="10" rx="2" ry="3" fill="currentColor" />
      
      {/* Mouth - small line */}
      <path d="M10 15h4" strokeWidth="1.5" />
    </svg>
  );
};

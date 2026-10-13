import React from 'react';

interface SectionAccessoryProps {
  children?: React.ReactNode;
}

function SectionAccessory({ children }: SectionAccessoryProps) {
  if (!children) return null;

  return <div className="discord-section-accessory">{children}</div>;
}

export default SectionAccessory;

import React from 'react';

interface SectionContentProps {
  children: React.ReactNode;
}

function SectionContent({ children }: SectionContentProps) {
  return <div className="discord-section-content">{children}</div>;
}

export default SectionContent;

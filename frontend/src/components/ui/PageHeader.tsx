import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="page-heading__eyebrow">{eyebrow}</p>}
        <h1 className="page-heading__title">{title}</h1>
        {description && <p className="page-heading__description">{description}</p>}
      </div>
    </header>
  );
}

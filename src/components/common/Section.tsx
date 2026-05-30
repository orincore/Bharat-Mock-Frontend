"use client";

import React, { createContext, useContext } from 'react';

const SectionTitleContext = createContext<string | undefined>(undefined);

export function Section({
  title,
  children,
  ...rest
}: {
  title: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <SectionTitleContext.Provider value={title}>
      <section aria-label={title} {...rest}>
        {children}
      </section>
    </SectionTitleContext.Provider>
  );
}

export function useSectionTitle() {
  return useContext(SectionTitleContext);
}

export default Section;

'use client';

import React from 'react';
import { BlockRenderer } from './BlockRenderer';
import { LiveExamCardsBlock } from './LiveExamCardsBlock';
import { AutoExamCardsBlock } from './AutoExamCardsBlock';

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
}

interface PageBlockRendererProps {
  block: Block;
}

export const PageBlockRenderer: React.FC<PageBlockRendererProps> = ({ block }) => {
  if (block.block_type === 'examCards') {
    return <LiveExamCardsBlock content={block.content} />;
  }
  if (block.block_type === 'autoExamCards') {
    return <AutoExamCardsBlock content={block.content} />;
  }
  // tableOfContents and all other blocks go through BlockRenderer which handles settings
  return <BlockRenderer block={block} />;
};

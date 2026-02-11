'use client';

import React from 'react';
import { BlockRenderer } from './BlockRenderer';
import { LiveExamCardsBlock } from './LiveExamCardsBlock';

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
  return <BlockRenderer block={block} />;
};

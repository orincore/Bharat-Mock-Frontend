"use client";

import NextImage, { type ImageProps as NextImageProps } from 'next/image';
import React from 'react';
import { useSectionTitle } from './Section';

type Props = NextImageProps & { alt?: string | undefined };

export default function Image(props: Props) {
  const sectionTitle = useSectionTitle();
  const { alt, ...rest } = props;

  const resolvedAlt = (alt && String(alt).trim().length > 0)
    ? alt
    : (sectionTitle ?? 'Image');

  // Ensure alt is always a string (Next/Image requires alt prop)
  return <NextImage {...(rest as NextImageProps)} alt={resolvedAlt} />;
}

'use client';
import React from 'react';
import { MainLayout } from '../../../components/layouts';
import { 
  HeroSection, 
  QuickStart, 
  ApiReference, 
  IntegrationGuides, 
  Examples 
} from '../../../components/sections/craftjs';

export default function BuilderDocsPage() {
  return (
    <MainLayout>
      <HeroSection />
      <QuickStart />
      <ApiReference />
      <IntegrationGuides />
      <Examples />
    </MainLayout>
  );
}

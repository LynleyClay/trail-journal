'use client';

import dynamic from 'next/dynamic';

const MapPageTabs = dynamic(() => import('./MapPageTabs'), { ssr: false });

export default MapPageTabs;

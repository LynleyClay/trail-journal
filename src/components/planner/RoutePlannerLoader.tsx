'use client';

import dynamic from 'next/dynamic';

const RoutePlanner = dynamic(() => import('./RoutePlanner'), { ssr: false });

export default RoutePlanner;

'use client';

import dynamic from 'next/dynamic';

const MyCurrentRoutes = dynamic(() => import('./MyCurrentRoutes'), { ssr: false });

export default MyCurrentRoutes;

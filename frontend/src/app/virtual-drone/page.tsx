'use client';

import React from 'react';
import VirtualDroneMissionControl from '../../components/VirtualDroneMissionControl';
import Link from 'next/link';
import { ArrowLeft, Map } from 'lucide-react';

export default function VirtualDronePage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href="/field-map"
          className="inline-flex items-center space-x-2 text-xs font-bold text-agri-green hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Field GIS Map</span>
        </Link>
      </div>

      <VirtualDroneMissionControl
        fieldName="Punjab Wheat & Field Acreage"
        cropName="Wheat (गेहूं)"
      />
    </div>
  );
}

/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { DimensionDescriptor } from './DimensionDescriptor';
import { DimensionLayer } from './DimensionLayer';

type DimensionCollector = (descriptor: DimensionDescriptor) => void;

const DimensionCollectorContext = createContext<DimensionCollector | null>(null);

type DescriptorBuffer = {
  beginFrame: () => void;
  collect: (descriptor: DimensionDescriptor) => void;
  getCurrent: () => DimensionDescriptor[];
};

const createDescriptorBuffer = (): DescriptorBuffer => {
  let buffer: Map<string, DimensionDescriptor> = new Map();
  return {
    beginFrame: () => {
      buffer = new Map();
    },
    collect: (descriptor: DimensionDescriptor) => {
      buffer.set(descriptor.id, descriptor);
    },
    getCurrent: () => Array.from(buffer.values()),
  };
};

interface DimensionCollectorProviderProps {
  children: ReactNode;
}

const DescriptorLayerRenderer: React.FC<{ buffer: DescriptorBuffer }> = ({ buffer }) => {
  return <DimensionLayer descriptors={buffer.getCurrent()} />;
};

export const DimensionCollectorProvider: React.FC<DimensionCollectorProviderProps> = ({ children }) => {
  const [buffer] = useState(createDescriptorBuffer);
  buffer.beginFrame();

  const collector = useCallback<DimensionCollector>(
    (descriptor: DimensionDescriptor) => {
      buffer.collect(descriptor);
    },
    [buffer],
  );

  return (
    <DimensionCollectorContext.Provider value={collector}>
      {children}
      <DescriptorLayerRenderer buffer={buffer} />
    </DimensionCollectorContext.Provider>
  );
};

export const useDimensionCollector = (): DimensionCollector | null => {
  return useContext(DimensionCollectorContext);
};


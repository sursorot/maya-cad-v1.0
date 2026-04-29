import type { DimensionDescriptor } from './DimensionDescriptor';
import { LinearDimension } from './LinearDimension';
import { DimensionChip } from './DimensionChip';
import { ArcDimension } from './ArcDimension';
import { measureChipDimensions } from './theme';
import { SpanDimension } from './SpanDimension';

interface DimensionLayerProps {
  descriptors: DimensionDescriptor[];
}

export const DimensionLayer: React.FC<DimensionLayerProps> = ({ descriptors }) => {
  if (!descriptors.length) {
    return null;
  }

  return (
    <g pointerEvents="none">
      {descriptors.map((descriptor) => {
        if (descriptor.type === 'linear') {
          return (
            <LinearDimension
              key={descriptor.id}
              start={descriptor.start}
              end={descriptor.end}
              text={descriptor.text}
              zoomScale={descriptor.zoomScale}
              offset={descriptor.offset}
              side={descriptor.side}
              lineColor={descriptor.lineColor}
              extensionColor={descriptor.extensionColor}
            />
          );
        }
        if (descriptor.type === 'chip') {
          const metrics = measureChipDimensions(descriptor.text, descriptor.zoomScale);
          return (
            <g key={descriptor.id} transform={`translate(${descriptor.position.x}, ${descriptor.position.y})`}>
              <DimensionChip text={descriptor.text} zoomScale={descriptor.zoomScale} metrics={metrics} center={descriptor.center ?? true} />
            </g>
          );
        }
        if (descriptor.type === 'arc') {
            return <ArcDimension key={descriptor.id} {...descriptor} />;
        }
        if (descriptor.type === 'span') {
          return (
            <SpanDimension
              key={descriptor.id}
              start={descriptor.start}
              end={descriptor.end}
              text={descriptor.text}
              zoomScale={descriptor.zoomScale}
              offset={descriptor.offset}
              lineColor={descriptor.lineColor}
              extensionColor={descriptor.extensionColor}
            />
          );
        }
        return null;
      })}
    </g>
  );
};


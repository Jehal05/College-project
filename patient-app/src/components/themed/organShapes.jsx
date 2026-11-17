// Draws one organ of the 2D body map from config/organArt.js. The strokes keep their width when the drawing is scaled.
// The organ list beside the map is the accessible way to choose an organ, so these shapes are hidden from screen readers
// (the parent group sets aria-hidden); the <title> gives a mouse user a tooltip.
import { ART, artFor } from '../../config/organArt';

const COLOR = (key) => `var(--ht-organ-${key})`;
const rgb = (key, alpha) => `rgb(${COLOR(key)}${alpha === undefined ? '' : ' / ' + alpha})`;
const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' };

/** One scaled copy of an organ drawing. `flip` mirrors it left to right (the second kidney). */
export function OrganShape({ organKey, index, shape, flip = 1, selected }) {
  const art = artFor(organKey, index);
  if (!art) return null;
  const edge = rgb(organKey);
  const fill = rgb(organKey, selected ? 0.5 : 0.24);
  const width = selected ? 2 : 1.1;
  const place = `translate(${shape.cx} ${shape.cy}) scale(${shape.rx * flip} ${shape.ry})`;
  const closed = { fill, stroke: edge, strokeWidth: width, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' };
  const thin = { ...line, stroke: edge, strokeWidth: 1, opacity: 0.9 };
  const pieces = (list, props) => (list || []).map((d, i) => <path key={d + i} d={d} {...props} />);
  const both = (list, props) => (
    <>
      {pieces(list, props)}
      <g transform="scale(-1 1)">{pieces(list, props)}</g>
    </>
  );
  if (art.half) {   // the brain. One flat fill for all parts (the group is made see-through as a whole, so overlaps do not show), then the lines
    const solid = { fill: edge, stroke: 'none' };
    return (
      <g transform={place}>
        {selected && both(art.half, { ...line, stroke: 'rgb(var(--ht-accent))', strokeWidth: 6, opacity: 0.35 })}
        <g opacity={selected ? 0.5 : 0.24}>
          {pieces(art.stem, solid)}
          {both(art.cerebellum, solid)}
          {both(art.half, solid)}
        </g>
        {pieces(art.stemLine, { ...line, stroke: edge, strokeWidth: width })}
        {both(art.cerebellumLine, { ...line, stroke: edge, strokeWidth: width })}
        {both(art.half, { ...line, stroke: edge, strokeWidth: width })}
        {both(art.folds, thin)}
      </g>
    );
  }
  return (
    <g transform={place}>
      {selected && pieces(art.outline, { ...line, stroke: 'rgb(var(--ht-accent))', strokeWidth: 6, opacity: 0.35 })}
      {pieces(art.outline, closed)}
      {pieces(art.extra, { ...closed, strokeWidth: 0.9 })}
      {pieces(art.detail, thin)}
      {pieces(art.tubes, { ...line, stroke: edge, strokeWidth: selected ? 3 : 2.4 })}
      {pieces(art.ducts, { ...line, stroke: edge, strokeWidth: 1.1 })}
    </g>
  );
}

/** The windpipe and its branches, drawn once between the two lungs (map coordinates). */
export function Windpipe({ selected }) {
  const edge = rgb('lungs');
  return <g>{ART.windpipe.ducts.map((d) => <path key={d} d={d} {...line} stroke={edge} strokeWidth={selected ? 2.2 : 1.6} />)}</g>;
}

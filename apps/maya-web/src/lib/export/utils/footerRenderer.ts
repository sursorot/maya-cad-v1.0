/**
 * Footer Renderer
 * Generates professional CAD-style footer for exports
 * Exact replica of the Geometry OS design specification from export-footer.html
 */

import type { ExportFooterOptions } from '../types';

// Base footer height at 1400px width (matching the HTML reference max-width)
const BASE_WIDTH = 1400;
const BASE_FOOTER_HEIGHT = 120; // Total height including padding

// Responsive scaling - minimum width before we need to stack elements
const MIN_FULL_LAYOUT_WIDTH = 800;
const MIN_COMPACT_WIDTH = 500;

// CSS Variables matching the HTML
const COLORS = {
  textPrimary: '#333333',
  textSecondary: '#666666',
  borderColor: '#E0E0E0',
  background: '#FFFFFF',
  northBorder: '#CCCCCC',
};

// Font family stack
const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Calculate footer height based on export width
 */
export function calculateFooterHeight(width: number): number {
  if (width >= MIN_FULL_LAYOUT_WIDTH) {
    // Full layout - standard height
    return BASE_FOOTER_HEIGHT;
  } else if (width >= MIN_COMPACT_WIDTH) {
    // Compact layout - slightly taller
    return BASE_FOOTER_HEIGHT + 40;
  } else {
    // Stacked layout - much taller
    return BASE_FOOTER_HEIGHT * 2.5;
  }
}

export const FOOTER_HEIGHT_PX = BASE_FOOTER_HEIGHT;
export const FOOTER_HEIGHT_MM = 30; // ~30mm at standard resolution

/**
 * Calculate responsive scale factor
 */
function getScaleFactor(width: number): number {
  // Scale proportionally to width, with minimum of 0.5 and maximum of 1.2
  const scale = width / BASE_WIDTH;
  return Math.max(0.5, Math.min(1.2, scale));
}

/**
 * Generate SVG footer element - exact match to HTML reference
 */
export function generateFooterSVG(
  options: ExportFooterOptions,
  width: number
): string {
  if (!options.enabled) {
    return '';
  }

  const scale = getScaleFactor(width);
  const height = calculateFooterHeight(width);
  const isCompact = width < MIN_FULL_LAYOUT_WIDTH;
  const isStacked = width < MIN_COMPACT_WIDTH;
  
  // Scaled dimensions matching HTML CSS
  const padding = {
    vertical: 20 * scale,
    horizontal: 30 * scale,
  };
  
  // North symbol dimensions (50px in HTML)
  const northSize = 50 * scale;
  const northFontSize = 20 * scale;
  
  // Page ID dimensions (64px font in HTML)
  const pageIdFontSize = 64 * scale;
  
  // Title dimensions
  const titleH1Size = 20 * scale;
  const titleH2Size = 12 * scale;
  
  // Meta grid dimensions
  const metaFontSize = 12 * scale;
  const metaGap = { row: 8 * scale, col: 15 * scale };
  
  // Company dimensions
  const logoSize = 40 * scale;
  const companyNameSize = 18 * scale;
  const companyTaglineSize = 11 * scale;
  const contactFontSize = 12 * scale;
  
  // Separator line height (80px in HTML)
  const separatorHeight = 80 * scale;
  
  // Section gaps
  const sectionGap = 20 * scale;

  if (isStacked) {
    return generateStackedFooterSVG(options, width, height, scale);
  }

  // Calculate section positions
  const contentWidth = width - padding.horizontal * 2;
  
  // Left section: North + Page ID + Title (flex-grow: 1)
  // Middle section: Project Meta (flex-shrink: 0)
  // Right section: Company Info (flex-shrink: 0)
  
  // Estimate widths for each section
  const metaSectionWidth = 180 * scale;
  const companySectionWidth = isCompact ? 200 * scale : 320 * scale;
  const leftSectionWidth = contentWidth - metaSectionWidth - companySectionWidth - sectionGap * 2;
  
  const leftSectionStart = padding.horizontal;
  const metaSectionStart = leftSectionStart + leftSectionWidth + sectionGap;
  const companySectionStart = metaSectionStart + metaSectionWidth + sectionGap;
  
  // Vertical center and bottom alignment
  const bottomY = height - padding.vertical;
  const centerY = height / 2;

  return `
    <g class="export-footer">
      <!-- Footer Background -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="${COLORS.background}" />
      
      <!-- Top Border -->
      <line x1="0" y1="0" x2="${width}" y2="0" stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Left Section: Page Info -->
      <g class="page-info" transform="translate(${leftSectionStart}, 0)">
        ${options.showNorthSymbol ? `
        <!-- North Symbol -->
        <g transform="translate(0, ${centerY - northSize / 2})">
          <circle cx="${northSize / 2}" cy="${northSize / 2}" r="${northSize / 2 - 1}" 
                  fill="none" stroke="${COLORS.northBorder}" stroke-width="1" />
          <text x="${northSize / 2}" y="${northSize / 2 + northFontSize * 0.35}" 
                text-anchor="middle" 
                font-family="${FONT_FAMILY}" 
                font-size="${northFontSize}" 
                font-weight="500" 
                fill="${COLORS.textSecondary}">N</text>
          <!-- Arrow on top -->
          <polygon points="${northSize / 2},${-2} ${northSize / 2 - 5 * scale},${6 * scale} ${northSize / 2 + 5 * scale},${6 * scale}" 
                   fill="${COLORS.textSecondary}" />
        </g>
        ` : ''}
        
        <!-- Page ID -->
        <text x="${options.showNorthSymbol ? northSize + 15 * scale : 0}" 
              y="${bottomY - 10 * scale}" 
              font-family="${FONT_FAMILY}" 
              font-size="${pageIdFontSize}" 
              font-weight="700" 
              fill="${COLORS.textPrimary}"
              dominant-baseline="alphabetic">${escapeXml(options.pageId || 'A01')}</text>
        
        <!-- Project Title -->
        <g transform="translate(${options.showNorthSymbol ? northSize + 15 * scale + (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 20 * scale : (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 20 * scale}, ${centerY - titleH1Size})">
          <text y="0" 
                font-family="${FONT_FAMILY}" 
                font-size="${titleH1Size}" 
                font-weight="500" 
                fill="${COLORS.textPrimary}"
                letter-spacing="0.5">${escapeXml((options.title || '').toUpperCase())}</text>
          <text y="${titleH1Size + 4 * scale}" 
                font-family="${FONT_FAMILY}" 
                font-size="${titleH2Size}" 
                font-weight="500" 
                fill="${COLORS.textSecondary}"
                letter-spacing="0.5">${escapeXml((options.subtitle || '').toUpperCase())}</text>
        </g>
      </g>
      
      <!-- Separator Line 1 -->
      <line x1="${metaSectionStart - sectionGap / 2}" 
            y1="${centerY - separatorHeight / 2}" 
            x2="${metaSectionStart - sectionGap / 2}" 
            y2="${centerY + separatorHeight / 2}" 
            stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Middle Section: Project Metadata -->
      <g class="project-meta" transform="translate(${metaSectionStart}, ${centerY - separatorHeight / 2 + 10 * scale})">
        ${generateMetaGrid(options, metaFontSize, metaGap, scale)}
      </g>
      
      <!-- Separator Line 2 -->
      <line x1="${companySectionStart - sectionGap / 2}" 
            y1="${centerY - separatorHeight / 2}" 
            x2="${companySectionStart - sectionGap / 2}" 
            y2="${centerY + separatorHeight / 2}" 
            stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Right Section: Company Info -->
      <g class="company-info" transform="translate(${companySectionStart}, ${centerY - logoSize / 2})">
        <!-- Logo (Geometry OS hexagon) -->
        <g transform="translate(0, 0)">
          <svg viewBox="0 0 100 100" width="${logoSize}" height="${logoSize}">
            <path d="M50 5L95 27.5V72.5L50 95L5 72.5V27.5L50 5Z" 
                  stroke="${COLORS.textPrimary}" stroke-width="8" fill="none"/>
            <path d="M5 27.5L50 50L95 27.5" 
                  stroke="${COLORS.textPrimary}" stroke-width="8" fill="none"/>
            <path d="M50 95V50" 
                  stroke="${COLORS.textPrimary}" stroke-width="8" fill="none"/>
          </svg>
        </g>
        
        <!-- Company Name -->
        <g transform="translate(${logoSize + 15 * scale}, ${logoSize / 2 - companyNameSize / 2})">
          <text y="0" 
                font-family="${FONT_FAMILY}" 
                font-size="${companyNameSize}" 
                font-weight="700" 
                fill="${COLORS.textPrimary}"
                dominant-baseline="hanging">${escapeXml(options.company?.name || 'Geometry OS')}</text>
          <text y="${companyNameSize + 2 * scale}" 
                font-family="${FONT_FAMILY}" 
                font-size="${companyTaglineSize}" 
                fill="${COLORS.textSecondary}"
                dominant-baseline="hanging">${escapeXml(options.company?.tagline || 'CAD of the Future.')}</text>
        </g>
        
        ${hasContactInfo(options) && !isCompact ? `
        <!-- Contact Info Separator -->
        <line x1="${logoSize + 15 * scale + 140 * scale}" 
              y1="${-5 * scale}" 
              x2="${logoSize + 15 * scale + 140 * scale}" 
              y2="${logoSize + 5 * scale}" 
              stroke="${COLORS.borderColor}" stroke-width="1" />
        
        <!-- Contact Info -->
        <g transform="translate(${logoSize + 15 * scale + 170 * scale}, ${logoSize / 2 - contactFontSize * 1.5})">
          ${generateContactInfo(options, contactFontSize, scale)}
        </g>
        ` : ''}
      </g>
    </g>
  `;
}

/**
 * Generate stacked footer layout for narrow exports
 */
function generateStackedFooterSVG(
  options: ExportFooterOptions,
  width: number,
  height: number,
  scale: number
): string {
  const padding = 15 * scale;
  const rowHeight = height / 3;
  
  const pageIdFontSize = Math.min(48 * scale, width * 0.1);
  const titleFontSize = Math.min(16 * scale, width * 0.04);
  const metaFontSize = Math.min(11 * scale, width * 0.028);
  const companyFontSize = Math.min(14 * scale, width * 0.035);
  
  return `
    <g class="export-footer stacked">
      <!-- Footer Background -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="${COLORS.background}" />
      <line x1="0" y1="0" x2="${width}" y2="0" stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Row 1: Page ID and Title -->
      <g transform="translate(${padding}, ${padding})">
        ${options.showNorthSymbol ? `
        <circle cx="20" cy="20" r="18" fill="none" stroke="${COLORS.northBorder}" stroke-width="1" />
        <text x="20" y="26" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="14" font-weight="500" fill="${COLORS.textSecondary}">N</text>
        ` : ''}
        <text x="${options.showNorthSymbol ? 50 : 0}" y="${pageIdFontSize * 0.8}" 
              font-family="${FONT_FAMILY}" font-size="${pageIdFontSize}" font-weight="700" 
              fill="${COLORS.textPrimary}">${escapeXml(options.pageId || 'A01')}</text>
        <text x="${options.showNorthSymbol ? 50 + (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 15 : (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 15}" 
              y="${pageIdFontSize * 0.4}" 
              font-family="${FONT_FAMILY}" font-size="${titleFontSize}" font-weight="500" 
              fill="${COLORS.textPrimary}">${escapeXml((options.title || '').toUpperCase())}</text>
        <text x="${options.showNorthSymbol ? 50 + (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 15 : (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 15}" 
              y="${pageIdFontSize * 0.4 + titleFontSize + 4}" 
              font-family="${FONT_FAMILY}" font-size="${titleFontSize * 0.7}" font-weight="500" 
              fill="${COLORS.textSecondary}">${escapeXml((options.subtitle || '').toUpperCase())}</text>
      </g>
      
      <!-- Separator -->
      <line x1="${padding}" y1="${rowHeight}" x2="${width - padding}" y2="${rowHeight}" 
            stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Row 2: Project Meta -->
      <g transform="translate(${padding}, ${rowHeight + 10})">
        <text x="0" y="${metaFontSize}" font-family="${FONT_FAMILY}" font-size="${metaFontSize}" fill="${COLORS.textSecondary}">
          Project: <tspan font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.projectName || '')}</tspan>
          ${options.projectNumber ? ` | No: <tspan font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.projectNumber)}</tspan>` : ''}
        </text>
        <text x="0" y="${metaFontSize * 2.5}" font-family="${FONT_FAMILY}" font-size="${metaFontSize}" fill="${COLORS.textSecondary}">
          Made by: <tspan font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.madeBy || '')}</tspan>
          | Date: <tspan font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.date || '')}</tspan>
        </text>
      </g>
      
      <!-- Separator -->
      <line x1="${padding}" y1="${rowHeight * 2}" x2="${width - padding}" y2="${rowHeight * 2}" 
            stroke="${COLORS.borderColor}" stroke-width="1" />
      
      <!-- Row 3: Company Info -->
      <g transform="translate(${padding}, ${rowHeight * 2 + 10})">
        <text x="0" y="${companyFontSize}" font-family="${FONT_FAMILY}" font-size="${companyFontSize}" font-weight="700" 
              fill="${COLORS.textPrimary}">${escapeXml(options.company?.name || 'Geometry OS')}</text>
        <text x="0" y="${companyFontSize * 2}" font-family="${FONT_FAMILY}" font-size="${companyFontSize * 0.7}" 
              fill="${COLORS.textSecondary}">${escapeXml(options.company?.tagline || '')} ${options.company?.phone ? `| ${escapeXml(options.company.phone)}` : ''}</text>
        <text x="0" y="${companyFontSize * 3}" font-family="${FONT_FAMILY}" font-size="${companyFontSize * 0.7}" 
              fill="${COLORS.textSecondary}">${escapeXml(options.company?.email || '')} ${options.company?.location ? `| ${escapeXml(options.company.location)}` : ''}</text>
      </g>
    </g>
  `;
}

/**
 * Generate metadata grid
 */
function generateMetaGrid(
  options: ExportFooterOptions, 
  fontSize: number, 
  gap: { row: number; col: number },
  scale: number
): string {
  const lineHeight = fontSize + gap.row;
  const labelWidth = 70 * scale;
  
  return `
    <text x="${labelWidth}" y="0" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLORS.textSecondary}">Project :</text>
    <text x="${labelWidth + gap.col}" y="0" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.projectName || '')}</text>
    
    <text x="${labelWidth}" y="${lineHeight}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLORS.textSecondary}">Project No :</text>
    <text x="${labelWidth + gap.col}" y="${lineHeight}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.projectNumber || '')}</text>
    
    <text x="${labelWidth}" y="${lineHeight * 2}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLORS.textSecondary}">Made by :</text>
    <text x="${labelWidth + gap.col}" y="${lineHeight * 2}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.madeBy || '')}</text>
    
    <text x="${labelWidth}" y="${lineHeight * 3}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLORS.textSecondary}">Date :</text>
    <text x="${labelWidth + gap.col}" y="${lineHeight * 3}" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="500" fill="${COLORS.textPrimary}">${escapeXml(options.date || '')}</text>
  `;
}

/**
 * Generate contact info text
 */
function generateContactInfo(
  options: ExportFooterOptions,
  fontSize: number,
  _scale: number
): string {
  const lineHeight = fontSize * 1.5;
  let lines: string[] = [];
  
  if (options.company?.phone) lines.push(options.company.phone);
  if (options.company?.email) lines.push(options.company.email);
  if (options.company?.location) lines.push(options.company.location);
  
  return lines.map((line, i) => 
    `<text y="${lineHeight * i}" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLORS.textSecondary}">${escapeXml(line)}</text>`
  ).join('\n');
}

/**
 * Check if contact info is provided
 */
function hasContactInfo(options: ExportFooterOptions): boolean {
  return !!(options.company?.phone || options.company?.email || options.company?.location);
}

/**
 * Draw footer on canvas context - exact match to HTML reference
 */
export function drawFooterOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: ExportFooterOptions,
  width: number,
  y: number
): void {
  if (!options.enabled) {
    return;
  }

  const scale = getScaleFactor(width);
  const height = calculateFooterHeight(width);
  const isCompact = width < MIN_FULL_LAYOUT_WIDTH;
  const isStacked = width < MIN_COMPACT_WIDTH;

  ctx.save();
  ctx.translate(0, y);

  // Footer Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Top border
  ctx.strokeStyle = COLORS.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.stroke();

  if (isStacked) {
    drawStackedFooterOnCanvas(ctx, options, width, height, scale);
  } else {
    drawFullFooterOnCanvas(ctx, options, width, height, scale, isCompact);
  }

  ctx.restore();
}

/**
 * Draw full footer layout on canvas
 */
function drawFullFooterOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: ExportFooterOptions,
  width: number,
  height: number,
  scale: number,
  isCompact: boolean
): void {
  const padding = { vertical: 20 * scale, horizontal: 30 * scale };
  const northSize = 50 * scale;
  const pageIdFontSize = 64 * scale;
  const titleH1Size = 20 * scale;
  const titleH2Size = 12 * scale;
  const metaFontSize = 12 * scale;
  const logoSize = 40 * scale;
  const companyNameSize = 18 * scale;
  const companyTaglineSize = 11 * scale;
  const contactFontSize = 12 * scale;
  const separatorHeight = 80 * scale;
  const sectionGap = 20 * scale;

  const contentWidth = width - padding.horizontal * 2;
  const metaSectionWidth = 180 * scale;
  const companySectionWidth = isCompact ? 200 * scale : 320 * scale;
  const leftSectionWidth = contentWidth - metaSectionWidth - companySectionWidth - sectionGap * 2;

  const leftSectionStart = padding.horizontal;
  const metaSectionStart = leftSectionStart + leftSectionWidth + sectionGap;
  const companySectionStart = metaSectionStart + metaSectionWidth + sectionGap;
  const centerY = height / 2;
  const bottomY = height - padding.vertical;

  // North Symbol
  if (options.showNorthSymbol) {
    const northCenterX = leftSectionStart + northSize / 2;
    const northCenterY = centerY;

    // Circle
    ctx.strokeStyle = COLORS.northBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(northCenterX, northCenterY, northSize / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    // N letter
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `500 ${northSize * 0.4}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', northCenterX, northCenterY);

    // Arrow
    ctx.beginPath();
    ctx.moveTo(northCenterX, northCenterY - northSize / 2 - 2);
    ctx.lineTo(northCenterX - 5 * scale, northCenterY - northSize / 2 + 6 * scale);
    ctx.lineTo(northCenterX + 5 * scale, northCenterY - northSize / 2 + 6 * scale);
    ctx.closePath();
    ctx.fill();
  }

  // Page ID
  const pageIdX = leftSectionStart + (options.showNorthSymbol ? northSize + 15 * scale : 0);
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `700 ${pageIdFontSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(options.pageId || 'A01', pageIdX, bottomY - 10 * scale);

  // Project Title
  const titleX = pageIdX + (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 20 * scale;
  ctx.font = `500 ${titleH1Size}px Inter, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText((options.title || '').toUpperCase(), titleX, centerY - titleH1Size);
  
  ctx.font = `500 ${titleH2Size}px Inter, sans-serif`;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.fillText((options.subtitle || '').toUpperCase(), titleX, centerY + 4 * scale);

  // Separator Line 1
  ctx.strokeStyle = COLORS.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(metaSectionStart - sectionGap / 2, centerY - separatorHeight / 2);
  ctx.lineTo(metaSectionStart - sectionGap / 2, centerY + separatorHeight / 2);
  ctx.stroke();

  // Project Metadata
  drawMetaGrid(ctx, options, metaSectionStart, centerY - separatorHeight / 2 + 10 * scale, metaFontSize, 8 * scale, 15 * scale, scale);

  // Separator Line 2
  ctx.beginPath();
  ctx.moveTo(companySectionStart - sectionGap / 2, centerY - separatorHeight / 2);
  ctx.lineTo(companySectionStart - sectionGap / 2, centerY + separatorHeight / 2);
  ctx.stroke();

  // Company Logo (simplified hexagon)
  const logoX = companySectionStart;
  const logoY = centerY - logoSize / 2;
  drawHexagonLogo(ctx, logoX, logoY, logoSize);

  // Company Name
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `700 ${companyNameSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(options.company?.name || 'Geometry OS', logoX + logoSize + 15 * scale, logoY + logoSize / 2 - companyNameSize / 2);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `400 ${companyTaglineSize}px Inter, sans-serif`;
  ctx.fillText(options.company?.tagline || 'CAD of the Future.', logoX + logoSize + 15 * scale, logoY + logoSize / 2 + companyNameSize / 2);

  // Contact Info (if space allows)
  if (hasContactInfo(options) && !isCompact) {
    const contactX = logoX + logoSize + 15 * scale + 140 * scale;
    
    // Separator
    ctx.strokeStyle = COLORS.borderColor;
    ctx.beginPath();
    ctx.moveTo(contactX, logoY - 5 * scale);
    ctx.lineTo(contactX, logoY + logoSize + 5 * scale);
    ctx.stroke();

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `400 ${contactFontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    
    let contactY = logoY + logoSize / 2 - contactFontSize;
    if (options.company?.phone) {
      ctx.fillText(options.company.phone, contactX + 30 * scale, contactY);
      contactY += contactFontSize * 1.5;
    }
    if (options.company?.email) {
      ctx.fillText(options.company.email, contactX + 30 * scale, contactY);
      contactY += contactFontSize * 1.5;
    }
    if (options.company?.location) {
      ctx.fillText(options.company.location, contactX + 30 * scale, contactY);
    }
  }
}

/**
 * Draw stacked footer layout on canvas
 */
function drawStackedFooterOnCanvas(
  ctx: CanvasRenderingContext2D,
  options: ExportFooterOptions,
  width: number,
  height: number,
  scale: number
): void {
  const padding = 15 * scale;
  const rowHeight = height / 3;
  
  const pageIdFontSize = Math.min(48 * scale, width * 0.1);
  const titleFontSize = Math.min(16 * scale, width * 0.04);
  const metaFontSize = Math.min(11 * scale, width * 0.028);
  const companyFontSize = Math.min(14 * scale, width * 0.035);

  // Row 1: Page ID and Title
  if (options.showNorthSymbol) {
    ctx.strokeStyle = COLORS.northBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(padding + 20, padding + 20, 18, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `500 14px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('N', padding + 20, padding + 25);
  }

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `700 ${pageIdFontSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(options.pageId || 'A01', options.showNorthSymbol ? padding + 50 : padding, padding);

  const titleX = (options.showNorthSymbol ? padding + 50 : padding) + (options.pageId?.length || 3) * pageIdFontSize * 0.6 + 15;
  ctx.font = `500 ${titleFontSize}px Inter, sans-serif`;
  ctx.fillText((options.title || '').toUpperCase(), titleX, padding + pageIdFontSize * 0.2);
  
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `500 ${titleFontSize * 0.7}px Inter, sans-serif`;
  ctx.fillText((options.subtitle || '').toUpperCase(), titleX, padding + pageIdFontSize * 0.2 + titleFontSize + 4);

  // Separator
  ctx.strokeStyle = COLORS.borderColor;
  ctx.beginPath();
  ctx.moveTo(padding, rowHeight);
  ctx.lineTo(width - padding, rowHeight);
  ctx.stroke();

  // Row 2: Project Meta
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `400 ${metaFontSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  let metaText = `Project: `;
  ctx.fillText(metaText, padding, rowHeight + 10);
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `500 ${metaFontSize}px Inter, sans-serif`;
  ctx.fillText(options.projectName || '', padding + ctx.measureText(metaText).width, rowHeight + 10);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `400 ${metaFontSize}px Inter, sans-serif`;
  ctx.fillText(`Made by: `, padding, rowHeight + 10 + metaFontSize * 2);
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `500 ${metaFontSize}px Inter, sans-serif`;
  ctx.fillText(`${options.madeBy || ''} | Date: ${options.date || ''}`, padding + ctx.measureText('Made by: ').width, rowHeight + 10 + metaFontSize * 2);

  // Separator
  ctx.strokeStyle = COLORS.borderColor;
  ctx.beginPath();
  ctx.moveTo(padding, rowHeight * 2);
  ctx.lineTo(width - padding, rowHeight * 2);
  ctx.stroke();

  // Row 3: Company Info
  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = `700 ${companyFontSize}px Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(options.company?.name || 'Geometry OS', padding, rowHeight * 2 + 10);

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = `400 ${companyFontSize * 0.7}px Inter, sans-serif`;
  ctx.fillText(`${options.company?.tagline || ''} ${options.company?.phone ? `| ${options.company.phone}` : ''}`, padding, rowHeight * 2 + 10 + companyFontSize + 4);
  ctx.fillText(`${options.company?.email || ''} ${options.company?.location ? `| ${options.company.location}` : ''}`, padding, rowHeight * 2 + 10 + companyFontSize * 2 + 8);
}

/**
 * Draw metadata grid on canvas
 */
function drawMetaGrid(
  ctx: CanvasRenderingContext2D,
  options: ExportFooterOptions,
  x: number,
  y: number,
  fontSize: number,
  rowGap: number,
  colGap: number,
  scale: number
): void {
  const lineHeight = fontSize + rowGap;
  const labelWidth = 70 * scale;
  
  const labels = ['Project :', 'Project No :', 'Made by :', 'Date :'];
  const values = [
    options.projectName || '',
    options.projectNumber || '',
    options.madeBy || '',
    options.date || ''
  ];

  ctx.textBaseline = 'top';
  
  labels.forEach((label, i) => {
    // Label
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = `400 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(label, x + labelWidth, y + lineHeight * i);
    
    // Value
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = `500 ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(values[i], x + labelWidth + colGap, y + lineHeight * i);
  });
}

/**
 * Draw hexagon logo on canvas
 */
function drawHexagonLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size * 0.45;

  ctx.strokeStyle = COLORS.textPrimary;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Hexagon outline
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = centerX + radius * Math.cos(angle);
    const py = centerY + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  // Lines from center
  ctx.beginPath();
  ctx.moveTo(centerX - radius * Math.cos(Math.PI / 6), centerY - radius * 0.5);
  ctx.lineTo(centerX, centerY);
  ctx.lineTo(centerX + radius * Math.cos(Math.PI / 6), centerY - radius * 0.5);
  ctx.stroke();

  // Vertical line from center to bottom
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX, centerY + radius);
  ctx.stroke();
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Calculate total export height including footer
 */
export function calculateTotalHeightWithFooter(
  contentHeight: number,
  footerOptions: ExportFooterOptions,
  width: number,
  gapPixels: number = 20
): number {
  if (!footerOptions.enabled) {
    return contentHeight;
  }
  const footerHeight = calculateFooterHeight(width);
  return contentHeight + gapPixels + footerHeight;
}

/**
 * Generate footer as standalone SVG for preview
 */
export function generateFooterPreviewSVG(
  options: ExportFooterOptions,
  width: number = 800
): string {
  const height = calculateFooterHeight(width);
  
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&amp;display=swap');
        </style>
      </defs>
      ${generateFooterSVG(options, width)}
    </svg>
  `;
}

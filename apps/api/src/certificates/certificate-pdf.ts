import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface CertificatePdfInput {
  studentName: string;
  courseTitle: string;
  trackTitle: string;
  trackColor: string;
  hours: number | null;
  xp: number;
  serial: string;
  issuedAt: Date;
  revoked: boolean;
  verifyUrl: string;
}

// ə, ğ, ı, ö, ş, ü, ç üçün Latin Extended dəstəkli şrift (pdfkit-in standart şriftləri WinAnsi-dir)
const FONT = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const FONT_BOLD = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');

const NAVY = '#13233f';
const MUTED = '#5b6b8a';
const BRAND = '#2bd4a4';
const AZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avqust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

export function formatAzDate(d: Date) {
  return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** A4 landşaft sertifikat — sol zolaq istiqamət rəngində, sağ altda QR (ictimai yoxlama linki) */
export async function renderCertificatePdf(c: CertificatePdfInput): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: { Title: `DaCy Academy sertifikatı — ${c.serial}`, Author: 'DaCy Academy' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (b: Buffer) => chunks.push(b));
  const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));
  const W = doc.page.width;
  const H = doc.page.height;
  doc.registerFont('Sans', FONT).registerFont('SansB', FONT_BOLD);

  doc.rect(0, 0, W, H).fill('#f6f8fc');
  doc.rect(0, 0, 26, H).fill(c.trackColor);
  doc.rect(26, 0, W - 26, 8).fill(BRAND);
  doc
    .roundedRect(60, 40, W - 120, H - 80, 14)
    .lineWidth(1)
    .stroke('#d9e0ee');

  // başlıq
  doc.roundedRect(90, 68, 34, 34, 8).fill(BRAND);
  doc.font('SansB').fontSize(15).fillColor(NAVY).text('Dc', 90, 76, { width: 34, align: 'center' });
  doc.font('SansB').fontSize(18).fillColor(NAVY).text('DaCy Academy', 136, 70);
  doc.font('Sans').fontSize(11).fillColor(MUTED).text('Tamamlama sertifikatı', 136, 93);

  // əsas mətn
  doc.font('Sans').fontSize(14).fillColor(MUTED).text('Bu sertifikat təsdiq edir ki,', 90, 160);
  doc
    .font('SansB')
    .fontSize(36)
    .fillColor(NAVY)
    .text(c.studentName, 90, 185, { width: W - 330 });
  doc.font('Sans').fontSize(14).fillColor(MUTED).text('aşağıdakı kursu uğurla tamamladı:', 90, 245);
  doc
    .font('SansB')
    .fontSize(24)
    .fillColor(NAVY)
    .text(c.courseTitle, 90, 272, { width: W - 330 });
  doc.roundedRect(90, 320, doc.widthOfString(c.trackTitle) + 24, 24, 12).fill(c.trackColor);
  doc.font('SansB').fontSize(11).fillColor('#ffffff').text(c.trackTitle, 102, 327);

  // meta
  const meta = [
    `Verilmə tarixi: ${formatAzDate(c.issuedAt)}`,
    `Seriya nömrəsi: ${c.serial}`,
    [c.hours ? `${c.hours} saat` : null, `${c.xp} XP`].filter(Boolean).join(' · '),
  ];
  doc.font('Sans').fontSize(11).fillColor(MUTED);
  meta.forEach((line, i) => doc.text(line, 90, H - 128 + i * 18));
  doc
    .font('Sans')
    .fontSize(9)
    .fillColor(MUTED)
    .text('DaCy Academy · təlim platforması', 90, H - 62);

  // QR + yoxlama linki
  const png = await QRCode.toBuffer(c.verifyUrl, {
    width: 300,
    margin: 1,
    color: { dark: NAVY, light: '#ffffff' },
  });
  doc.roundedRect(W - 258, H - 268, 176, 206, 10).fill('#ffffff');
  doc.image(png, W - 240, H - 258, { width: 140 });
  doc
    .font('Sans')
    .fontSize(8)
    .fillColor(MUTED)
    .text('Yoxlama üçün skan edin', W - 258, H - 110, { width: 176, align: 'center' });
  doc
    .font('Sans')
    .fontSize(7)
    .fillColor(MUTED)
    .text(c.verifyUrl, W - 258, H - 96, { width: 176, align: 'center' });

  if (c.revoked) {
    doc.save();
    doc.rotate(-18, { origin: [W / 2, H / 2] });
    doc
      .font('SansB')
      .fontSize(64)
      .fillColor('#e5484d')
      .opacity(0.45)
      .text('LƏĞV EDİLİB', 0, H / 2 - 40, { width: W, align: 'center' });
    doc.restore();
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}

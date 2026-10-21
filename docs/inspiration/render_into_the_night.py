"""Render the research brief and the 38 user-supplied reference photographs."""
from pathlib import Path
import re
from html import escape
from io import BytesIO

from PIL import Image as PILImage, ImageOps
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether,
)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/inspiration/into-the-night-designer-brief.md'
OUT = ROOT / 'output/pdf/magma-into-the-night-designer-brief.pdf'
FONTS = Path('/Users/maja/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype')
for name, filename in [('Research', 'DejaVuSans.ttf'), ('ResearchBold', 'DejaVuSans-Bold.ttf'), ('ResearchItalic', 'DejaVuSans-Oblique.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / filename)))
pdfmetrics.registerFontFamily('Research', normal='Research', bold='ResearchBold', italic='ResearchItalic', boldItalic='ResearchBold')

INK, MUTED, ACCENT = [HexColor(c) for c in ['#252322', '#69635E', '#75443C']]
styles = {
    'title': ParagraphStyle('title', fontName='ResearchBold', fontSize=25, leading=30, textColor=INK, spaceAfter=16),
    'h2': ParagraphStyle('h2', fontName='ResearchBold', fontSize=18, leading=23, textColor=INK, spaceAfter=17, keepWithNext=True),
    'h3': ParagraphStyle('h3', fontName='ResearchBold', fontSize=11, leading=16, textColor=ACCENT, spaceBefore=11, spaceAfter=6, keepWithNext=True),
    'body': ParagraphStyle('body', fontName='Research', fontSize=10, leading=14.5, textColor=INK, spaceAfter=9, allowWidows=0, allowOrphans=0),
    'quote': ParagraphStyle('quote', fontName='ResearchItalic', fontSize=10, leading=14.5, textColor=INK, leftIndent=12, rightIndent=5, spaceBefore=5, spaceAfter=6, keepWithNext=True),
    'cite': ParagraphStyle('cite', fontName='Research', fontSize=8, leading=11, textColor=MUTED, leftIndent=12, spaceAfter=14),
    'bullet': ParagraphStyle('bullet', fontName='Research', fontSize=9.5, leading=13.5, textColor=INK, leftIndent=10, firstLineIndent=-10, spaceAfter=9),
    'register': ParagraphStyle('register', fontName='Research', fontSize=8.7, leading=12.2, textColor=INK, leftIndent=10, firstLineIndent=-10, spaceAfter=6),
    'caption': ParagraphStyle('caption', fontName='Research', fontSize=7.3, leading=10, textColor=MUTED, spaceAfter=3),
}

def markup(text):
    # Preserve wording; normalize only typographic dash glyphs for PDF portability.
    text = text.replace('–', '-').replace('—', '-').replace('\u2011', '-')
    text = escape(text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    return text

W, H = A4
def footer(c, doc):
    c.setStrokeColor(HexColor('#DDD7D0'))
    c.setLineWidth(0.5)
    c.line(48, 44, W-48, 44)
    c.setFont('Research', 7)
    c.setFillColor(MUTED)
    c.drawString(48, 30, 'MAGMA / INSPIRATION RESEARCH / INTO THE NIGHT')
    c.drawRightString(W-48, 30, str(doc.page))

class Brief(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'h2':
            label = flowable.getPlainText()
            key = 'section-' + str(self.seq.nextf('section'))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(label, key, 0)

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = Brief(str(OUT), pagesize=A4, leftMargin=48, rightMargin=48,
            topMargin=47, bottomMargin=59, title='Magma inspiration from Into the Night',
            author='Magma', subject='Designer brief, highlighted quotations and source photographs')
doc.addPageTemplates(PageTemplate(id='main', frames=[Frame(48, 59, W-96, H-106, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=footer))
raw = SOURCE.read_text()
parts = re.split(r'\n\s*\n', raw.strip())
story = []
first_section = True
section = ''
for part in parts:
    part = part.strip()
    if part.startswith('# '):
        story.append(Paragraph(markup(part[2:]), styles['title']))
    elif part.startswith('## '):
        if not first_section:
            story.append(PageBreak())
        first_section = False
        section = part[3:]
        story.append(Paragraph(markup(part[3:]), styles['h2']))
    elif part.startswith('### '):
        if part == '### Print as something to keep':
            story.append(PageBreak())
            story.append(Paragraph('Visual references continued', styles['h2']))
        story.append(Paragraph(markup(part[4:]), styles['h3']))
    elif part.startswith('> '):
        story.append(Paragraph(markup(part[2:]), styles['quote']))
    elif re.match(r'Q\d\d \|', part):
        story.append(Paragraph(markup(part), styles['cite']))
    elif part.startswith('- '):
        for line in part.splitlines():
            kind = 'register' if section == 'Source register for all photographs' else 'bullet'
            story.append(Paragraph(markup('• ' + line[2:]), styles[kind]))
    elif re.match(r'\d\. ', part):
        for line in part.splitlines():
            story.append(Paragraph(markup(line), styles['bullet']))
    else:
        if part.startswith('The highlighted narrative ties Estridentismo'):
            story.append(PageBreak())
            story.append(Paragraph('CDMX and collective identity continued', styles['h2']))
        story.append(Paragraph(markup(part), styles['body']))

# Four full, uncropped source photographs per page. These are reference images,
# not a proposed moodboard or a flattened transcription of the source text.
register = {}
for match in re.finditer(r'\*\*IMG_(\d+) \| (.*?) \| (.*?)\.\*\* (.*)', raw):
    register[int(match[1])] = (match[2], match[3], match[4])
assert len(register) == 38
streams = []
for start in range(8857, 8895, 4):
    story.append(PageBreak())
    end = min(start+3, 8894)
    story.append(Paragraph('Photographic source appendix', styles['h2']))
    story.append(Paragraph(f'IMG_{start} to IMG_{end} / supplied photographs / zoom to inspect markings', styles['caption']))
    story.append(Spacer(1, 9))
    cells = []
    for n in range(start, end+1):
        src = Path(f'/Users/maja/Downloads/IMG_{n}.jpeg')
        with PILImage.open(src) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((1200, 1600))
            data = BytesIO()
            im.save(data, format='JPEG', quality=65, optimize=True)
            data.seek(0)
            iw, ih = im.size
        streams.append(data)
        scale = min(228 / iw, 282 / ih)
        page, typ, desc = register[n]
        cells.append([Image(data, width=iw*scale, height=ih*scale, hAlign='LEFT'), Spacer(1, 5),
                      Paragraph(f'<b>IMG_{n}.jpeg</b> | {escape(page)}', styles['caption'])])
    while len(cells) < 4:
        cells.append([])
    table = Table([[cells[0], cells[1]], [cells[2], cells[3]]], colWidths=[(W-96)/2]*2, rowHeights=[319,319])
    table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),0), ('RIGHTPADDING',(0,0),(-1,-1),9), ('TOPPADDING',(0,0),(-1,-1),0), ('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story.append(table)

doc.build(story)
reader = PdfReader(OUT)
text = '\n'.join(p.extract_text() or '' for p in reader.pages)
assert all(f'Q{n:02}' in text for n in range(1,38))
assert all(f'IMG_{n}' in text for n in range(8857,8895))
assert '\ufffd' not in text
print(f'{OUT}\nPages: {len(reader.pages)}\nBytes: {OUT.stat().st_size}\n37 quote references and 38 source identifiers verified.')
for i, page in enumerate(reader.pages, 1):
    t = page.extract_text() or ''
    print(f'{i:02}: {len(t):5} characters | {t.splitlines()[2:4]}')

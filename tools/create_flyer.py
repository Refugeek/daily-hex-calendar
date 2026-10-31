"""Create the office A5 flyer. Requires reportlab; uses the game's actual geometry."""
import json
import math
from pathlib import Path
import subprocess

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://refugeek.github.io/daily-hex-calendar/?group=EC3B3'
OUT = ROOT / 'output/pdf/daily-hex-EC3B3-A5.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, file in [('Serif', 'georgia.ttf'), ('Sans', 'segoeui.ttf'), ('Bold', 'seguisb.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + file))

data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', """
import {BOARD,PIECES,occupied,targets} from './engine.js';
import {solve} from './tools/solver.js';
import {hexBoundaryLoops} from './geometry.js';
const labels=targets('2026-03-02'),solution=solve(labels).placements;
console.log(JSON.stringify({targets:BOARD.filter(c=>labels.includes(c.label)),
tiles:PIECES.map((p,i)=>hexBoundaryLoops(occupied(p,solution[i])))}));
"""], cwd=ROOT, text=True))

ink, green, muted = map(HexColor, ['#313b30', '#657451', '#737a69'])
paper, line = map(HexColor, ['#f4f1e9', '#d6d9cb'])
c = canvas.Canvas(str(OUT), pagesize=A5)
c.setTitle('Daily Hex - EC3B3 office challenge')
c.setAuthor('Daily Hex')
W, H = A5
c.setFillColor(paper)
c.rect(0, 0, W, H, fill=1, stroke=0)

def text(x, y, value, font='Sans', size=10, color=ink):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x * mm, y * mm, value)

def tracked(x, y, value, size=7, spacing=1.4, color=green):
    t = c.beginText(x * mm, y * mm)
    t.setFont('Bold', size)
    t.setCharSpace(spacing)
    t.setFillColor(color)
    t.textOut(value)
    t.setCharSpace(0)
    c.drawText(t)

def path(points, fill, stroke=None, width=1):
    p = c.beginPath()
    p.moveTo(*points[0])
    for pt in points[1:]: p.lineTo(*pt)
    p.close()
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.setLineWidth(width)
    c.drawPath(p, fill=1, stroke=bool(stroke))

tracked(13, 194, 'DAILY HEX', size=8, spacing=2.2)
text(96, 194, 'THE OFFICE CHALLENGE', 'Bold', 6.6, muted)
c.setStrokeColor(line)
c.setLineWidth(.6)
c.line(13*mm, 188*mm, 135*mm, 188*mm)
text(13, 173, 'A little puzzle.', 'Serif', 30)
text(13, 160, 'A little rivalry.', 'Serif', 30, green)
text(13, 148, 'Tried the wooden puzzle? Take it online.', size=10)
text(13, 142, 'Play the daily challenge with your colleagues.', size=10)

# A vector illustration of an actual solved puzzle, with its three date spaces open.
c.saveState()
c.translate(74*mm, 106*mm)
c.scale(.50, .50)
frame = [(-260,0),(-154,184),(154,184),(260,0),(154,-184),(-154,-184)]
path([(x,y-5) for x,y in frame], HexColor('#9c7746'))
path(frame, HexColor('#d3b07a'), HexColor('#ae8751'), 1.5)
palette = ['#9e7147','#a77b50','#966b43','#ac8051','#9a6d45','#a3774a','#936a43','#a87a4d','#a07248','#996c42','#ab7d4e','#9f744a']
size=28
cx=size*math.sqrt(3)*2.5
def xy(q,r): return size*math.sqrt(3)*(q+r/2)-cx, 126-size*1.5*r
for loops, color in zip(data['tiles'], palette):
    for loop in loops:
        path([xy((x-y/3)/2,y/3) for x,y in loop], HexColor(color), HexColor('#75512e'), 1.5)
for target in data['targets']:
    x,y=xy(target['q'],target['r'])
    pts=[(x+size*math.cos(math.radians(i*60-30)),y+size*math.sin(math.radians(i*60-30))) for i in range(6)]
    path(pts,HexColor('#e8e9cc'),green,1.8)
    c.setFillColor(ink)
    c.setFont('Bold',10)
    c.drawCentredString(x,y-3,target['label'])
c.restoreState()
tracked(31, 61, '12 PIECES. 3 OPEN SPACES. ONE DAILY PUZZLE.', size=6.5, spacing=.6)

# White quiet zone remains intact; no logo or decorative elements cover QR modules.
qr = QrCodeWidget(URL, barLevel='M', barBorder=4, barFillColor=ink)
b = qr.getBounds()
qr_size=38*mm
d = Drawing(qr_size,qr_size,transform=[qr_size/(b[2]-b[0]),0,0,qr_size/(b[3]-b[1]),0,0])
d.add(qr)
c.setFillColor(white)
c.rect(13*mm, 19*mm, qr_size, qr_size, fill=1, stroke=0)
renderPDF.draw(d,c,13*mm,19*mm)
c.linkURL(URL,(13*mm,19*mm,51*mm,57*mm),relative=0)
tracked(59, 52, 'SCAN. SOLVE. COMPETE.', size=7, spacing=.9)
text(59, 42, 'Join EC3B3', 'Serif', 22, green)
text(59, 34, 'Choose a nickname. Solve today\'s puzzle.', size=8.2)
text(59, 29, 'See how your time stacks up.', size=8.2)
text(59, 22, 'Your first daily solve is your ranked attempt.', size=7.5, color=muted)
text(13, 12, 'refugeek.github.io/daily-hex-calendar/?group=EC3B3', size=7.8, color=green)
c.linkURL(URL,(13*mm,10*mm,135*mm,16*mm),relative=0)
c.showPage()
c.save()
print(OUT)


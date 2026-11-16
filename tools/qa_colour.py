import json, subprocess, numpy as np, cv2, sys, glob, re
def metrics(im):
    H,W=im.shape[:2]; m=np.ones((H,W),bool); m[int(H*880/1080):int(H*1010/1080)]=0
    f=im.astype(np.float32)/255; Y=0.2126*f[...,0]+0.7152*f[...,1]+0.0722*f[...,2]
    hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV).astype(np.float32)/255
    lab=cv2.cvtColor(im,cv2.COLOR_RGB2LAB).astype(np.float32); L=lab[...,0]*100/255; C=np.hypot(lab[...,1]-128,lab[...,2]-128)
    y=Y[m]; s=hsv[...,1][m&(hsv[...,2]>0.15)]; c=C[m&(L>40)&(L<85)]
    rgb=im[m].astype(np.float32); idx=np.argsort(y); k=max(1,len(idx)//200)
    yy,xx=np.mgrid[0:H,0:W]; r=np.hypot((xx-W/2)/(W/2),(yy-H/2)/(H/2))/np.sqrt(2)
    vig=Y[(r>=0.9)&m].mean()/max(1e-6,Y[(r<0.3)&m].mean())
    return dict(p5=np.percentile(y,5),p50=np.median(y),p95=np.percentile(y,95),std=y.std(),S50=np.median(s),C50=np.median(c) if len(c) else np.nan,vig=vig,bp=rgb[idx[:k]].mean(0),wp=rgb[idx[-k:]].mean(0))
def agg(rs,name):
    if not rs: return
    g=lambda k: np.nanmedian([r[k] for r in rs]); bp=np.median([r['bp'] for r in rs],0).astype(int); wp=np.median([r['wp'] for r in rs],0).astype(int)
    print(f"{name:7s} n={len(rs):3d} Y p5 {g('p5'):.2f} p50 {g('p50'):.2f} p95 {g('p95'):.2f} std {g('std'):.2f} | S {g('S50'):.2f} C* {g('C50'):.1f} | vig {g('vig'):.2f} | black {tuple(bp)} white {tuple(wp)}")
src=sys.argv[1]; kinds=json.load(open(sys.argv[2]))['shots'] if len(sys.argv)>2 else None
kind=lambda t: next((s['kind'] for s in kinds if s['start']<=t<s['end']),'?') if kinds else 'all'
rows=[]
if src.endswith('.mp4'):
    W,H=1920,1080; p=subprocess.Popen(['ffmpeg','-v','error','-i',src,'-vf','fps=2','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE); t=0.25
    while True:
        b=p.stdout.read(W*H*3)
        if len(b)<W*H*3: break
        d=metrics(np.frombuffer(b,np.uint8).reshape(H,W,3)); d['k']=kind(t); rows.append(d); t+=0.5
else:
    for fn in sorted(glob.glob(src+'/*s_*.png')):
        t=float(re.findall(r'_([\d.]+)\.png',fn)[0]); im=cv2.cvtColor(cv2.imread(fn),cv2.COLOR_BGR2RGB); d=metrics(im); d['k']=kind(t); rows.append(d)
agg(rows,'ALL')
for k in sorted(set(r['k'] for r in rows)): agg([r for r in rows if r['k']==k],k)
print('REF    interior Y p5 0.12 p50 0.45 p95 0.87 std 0.22 | S 0.42 C* 28.4 | vig 0.67 | night p50 0.24 S 0.61 C* 36.7 vig 0.46 | all p50 0.45 S 0.47 C* 31.9 | black ~(35,19,20)')
